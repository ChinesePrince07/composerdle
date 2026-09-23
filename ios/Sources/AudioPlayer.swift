import AVFoundation
import SwiftUI

// Thin AVPlayer wrapper. Streams the R2 mp3 and publishes time/duration/playing so
// the score view can auto-turn pages in step with the recording. Uses a MainActor
// polling task (not addPeriodicTimeObserver) to stay clean under Swift 6 strict
// concurrency — the observer block is @Sendable and can't capture main-actor state.
@MainActor
final class AudioPlayer: ObservableObject {
    @Published private(set) var time: Double = 0
    @Published private(set) var duration: Double = 0
    @Published private(set) var playing = false

    private var player: AVPlayer?
    private var ticker: Task<Void, Never>?
    private var urlString = ""

    func load(_ url: String) {
        guard url != urlString else { return }
        stop()
        urlString = url
        guard let u = URL(string: url) else { return }
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        player = AVPlayer(playerItem: AVPlayerItem(url: u))
        play()   // auto-play the recording as soon as the piece loads
    }

    func toggle() { playing ? pause() : play() }

    // Halt playback but keep the loaded clip and its position — used when the player leaves the
    // By Ear tab, so coming back resumes instead of restarting the piece.
    func pause() {
        guard playing else { return }
        player?.pause()
        playing = false
        ticker?.cancel(); ticker = nil
    }

    func stop() {
        ticker?.cancel(); ticker = nil
        player?.pause(); player = nil
        playing = false; time = 0; duration = 0; urlString = ""
    }

    private func play() {
        guard let p = player else { return }
        if duration > 0, time >= duration - 0.5 { p.seek(to: .zero); time = 0 }   // finished: play again from the top
        try? AVAudioSession.sharedInstance().setActive(true)
        p.play()
        playing = true
        // Poll only while playing. Every @Published write re-renders the score card, so a ticker left
        // running on a paused clip kept the app awake ~3 times a second for the rest of the session.
        ticker?.cancel()
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(300))
                guard let self, let p = self.player else { return }
                self.sync(p)
            }
        }
    }

    private func sync(_ p: AVPlayer) {
        let t = p.currentTime().seconds
        if t.isFinite, t != time { time = t }
        if let d = p.currentItem?.duration.seconds, d.isFinite, d > 0, d != duration { duration = d }
        // Stopped underneath us: the recording ended, headphones were unplugged, or a call came in.
        if p.timeControlStatus == .paused { playing = false; ticker?.cancel(); ticker = nil }
    }
}
