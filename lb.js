// Composerdle shared client: device token, API helpers, name bar, leaderboard, stats.

let _tok = null;
function cdToken() {
  if (_tok) return _tok;
  try {
    let t = localStorage.getItem('cdle-token');
    if (!t) { t = crypto.randomUUID(); localStorage.setItem('cdle-token', t); }
    _tok = t;
  } catch (e) { _tok = 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36); } // memoized: one page = one identity even without storage (no randomUUID dependency here)
  return _tok;
}

// the browser's current stage name — kept locally so renames survive the server's stale reads
function cdName() { try { return localStorage.getItem('cdle-name') || ''; } catch (e) { return ''; } }
function cdSetName(v) { try { localStorage.setItem('cdle-name', v); } catch (e) {} }

// every call gets a hard timeout — a hung request must never leave the UI stuck busy.
// The timer stays armed through the BODY read too: headers can arrive and the body still stall.
async function apiFetch(path, opts) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  try {
    let r;
    try { r = await fetch(path, { ...opts, signal: ctl.signal }); }
    catch (e) { throw new Error('the hall did not answer — try again'); }
    let j;
    try { j = await r.json(); }
    catch (e) {
      if (ctl.signal.aborted) throw new Error('the hall did not answer — try again');
      j = {};
    }
    if (!r.ok) throw Object.assign(new Error(j.error || 'api error'), { data: j });
    return j;
  } finally { clearTimeout(t); }
}
function apiGet(path) {
  return apiFetch(path + (path.includes('?') ? '&' : '?') + 'token=' + cdToken());
}
function apiPost(path, body) {
  return apiFetch(path, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    // the current name rides every POST so a settle racing a rename can't resurrect the old name
    body: JSON.stringify({ token: cdToken(), ...(cdName() ? { name: cdName() } : {}), ...body }),
  });
}

const lbEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// tiny WebAudio jingles: win = rising arpeggio, good = two-note chime,
// wrong = dissonant buzz, lose = descending sigh. No audio files needed.
function sfx(kind) {
  try {
    const ctx = (sfx.ctx = sfx.ctx || new (window.AudioContext || window.webkitAudioContext)());
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const seq = {
      win: [523.25, 659.25, 783.99, 1046.5],
      good: [659.25, 987.77],
      wrong: [196, 185],
      lose: [392, 329.63, 261.63],
    }[kind] || [];
    const together = kind === 'wrong';
    seq.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = kind === 'wrong' ? 'sawtooth' : 'triangle';
      o.frequency.value = f;
      const t = now + (together ? 0 : i * 0.11);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(kind === 'wrong' ? 0.05 : 0.1, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'wrong' ? 0.35 : 0.45));
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.6);
    });
  } catch (e) {}
}

let _profile = null;
async function cdProfile(force) {
  if (!_profile || force) { try { _profile = await apiGet('/api/player'); } catch (e) { _profile = { name: '', career: 0, games: 0, wins: 0, dist: {}, streak: { cur: 0, max: 0 } }; } }
  // local name wins over a possibly-stale server copy; backfill local from server for old players
  const local = cdName();
  if (local) _profile.name = local;
  else if (_profile.name) cdSetName(_profile.name);
  return _profile;
}

// Erase this browser's server profile + local identity (App Store Guideline 5.1.1(v)).
async function cdDeleteData() {
  try { await apiFetch('/api/player?token=' + cdToken(), { method: 'DELETE' }); } catch (e) {}
  try {
    localStorage.removeItem('cdle-token');
    localStorage.removeItem('cdle-name');
    localStorage.removeItem('cdle-seen');
    sessionStorage.removeItem('cdle-name-skip');
  } catch (e) {}
  _tok = null; _profile = null;
  location.reload();
}

// name bar (#namebar): asks for a stage name until one exists
async function lbNameBar(onSet) {
  const bar = document.getElementById('namebar');
  const prof = await cdProfile();
  function render() {
    if (_profile.name) {
      bar.innerHTML = `on the programme as <strong>${lbEsc(_profile.name)}</strong> · <a href="#" id="nbChange">change</a> · <a href="#" id="nbDelete">delete my data</a>`;
      bar.querySelector('#nbChange').addEventListener('click', e => { e.preventDefault(); form(); });
      bar.querySelector('#nbDelete').addEventListener('click', e => {
        e.preventDefault();
        if (confirm('Delete your stage name, stats, and leaderboard entry? This cannot be undone.')) cdDeleteData();
      });
    } else form();
  }
  function form() {
    bar.innerHTML = `<label for="nbInput">Your stage name:</label>
      <input id="nbInput" maxlength="24" placeholder="e.g. Maestro Fortissimo" autocomplete="nickname">
      <button id="nbSave">Enter the hall</button>`;
    const save = async () => {
      const v = bar.querySelector('#nbInput').value.trim();
      if (!v) return;
      // Honour the server's "name taken" 409; fall through to commit on a network error.
      try { await apiPost('/api/player', { name: v }); }
      catch (e) { if (e.data && e.data.error) { alert(e.data.error); return; } }
      cdSetName(v); _profile.name = v;
      render(); onSet && onSet();
    };
    bar.querySelector('#nbSave').addEventListener('click', save);
    bar.querySelector('#nbInput').addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  }
  render();
}

// first-open username prompt (#dlgName): modal until a name exists or the player skips
async function lbNamePrompt(next) {
  const p = await cdProfile();
  let skipped = false;
  try { skipped = !!sessionStorage.getItem('cdle-name-skip'); } catch (e) {}
  const dlg = document.getElementById('dlgName');
  if (p.name || skipped || !dlg) return next && next();
  const input = dlg.querySelector('input');
  const finish = () => { dlg.close(); next && next(); };
  dlg.querySelector('#dlgNameSave').onclick = async () => {
    const v = input.value.trim();
    if (!v) return;
    try { await apiPost('/api/player', { name: v }); }
    catch (e) { if (e.data && e.data.error) { alert(e.data.error); return; } }
    cdSetName(v); _profile.name = v;
    lbNameBar(); lbRender(); finish();
  };
  dlg.querySelector('#dlgNameSkip').onclick = e => {
    e.preventDefault();
    try { sessionStorage.setItem('cdle-name-skip', '1'); } catch (e2) {}
    finish();
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') dlg.querySelector('#dlgNameSave').click(); });
  dlg.showModal();
  input.focus();
}

// leaderboard (#boardList + #boardTabs): career and today's-puzzle views
let _scope = 'career';
async function lbRender() {
  const ol = document.getElementById('boardList');
  const tabs = document.getElementById('boardTabs');
  if (tabs && !tabs.dataset.wired) {
    tabs.dataset.wired = 1;
    tabs.addEventListener('click', e => {
      const s = e.target.dataset.scope;
      if (s) { _scope = s; lbRender(); }
    });
  }
  if (tabs) [...tabs.querySelectorAll('button')].forEach(b =>
    b.classList.toggle('on', b.dataset.scope === _scope));
  try {
    const { top, me } = await apiGet(`/api/leaderboard?scope=${_scope}`);
    const meName = (_profile && _profile.name) || '';
    const row = (e, extra, rank) =>
      `<li class="${extra}"${rank ? ` data-rank="${rank}"` : ''}><span>${lbEsc(e.name)}${e.streak > 1 ? ` <em class="stk">🔥${e.streak}</em>` : ''}</span><span>${e.score}</span></li>`;
    if (!top.length) {
      ol.innerHTML = '<li class="empty">An empty hall — be the first on stage.</li>';
    } else {
      let html = top.map(e => row(e, e.name === meName ? 'me' : '')).join('');
      // caller ranked outside the top 25 → pin their own row below a gap
      if (me) html += '<li class="gap" aria-hidden="true">⋯</li>' + row(me, 'me mine', me.rank);
      ol.innerHTML = html;
    }
  } catch (e) {
    ol.innerHTML = '<li class="empty">Leaderboard unreachable.</li>';
  }
}

// stats (#statsOut): games, win %, streaks, guess distribution
async function statsRender() {
  const el = document.getElementById('statsOut');
  const p = await cdProfile(true);
  const winPct = p.games ? Math.round(100 * p.wins / p.games) : 0;
  const maxD = Math.max(1, ...Object.values(p.dist || {}));
  const bar = k => {
    const v = (p.dist || {})[k] || 0;
    return `<div class="drow"><span>${k}</span><div class="dbar" style="width:${8 + 92 * v / maxD}%">${v || ''}</div></div>`;
  };
  el.innerHTML = `
    <div class="statrow"><b>${p.games}</b> played · <b>${winPct}%</b> won · <b>${p.career}</b> career pts</div>
    <div class="statrow">streak <b>${p.streak.cur}</b> · best <b>${p.streak.max}</b></div>
    <div class="dist">${[1, 2, 3, 4, 5, 6, 'x'].map(bar).join('')}</div>`;
}
