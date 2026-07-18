// Composerdle — data + pure game logic. Loaded by index.html, also runs under node for test.js.

const COMPOSERS = [
  {
    name: 'Johann Sebastian Bach', years: '1685–1750', alt: ['jsbach'],
    facts: [
      'He spent a month in jail for stubbornly trying to quit his job as a court musician in Weimar.',
      'He once walked roughly 250 miles — each way — just to hear the great organist Dieterich Buxtehude play.',
      'He fathered twenty children, several of whom became celebrated composers in their own right.',
      'A devout Lutheran, he signed his manuscripts "S.D.G." — Soli Deo Gloria, "to God alone the glory."',
      'He wrote "The Well-Tempered Clavier" and the six "Brandenburg Concertos."',
      'German Baroque master whose surname means "brook" — the organ world\'s "Toccata and Fugue in D minor" is his.',
    ],
  },
  {
    name: 'Wolfgang Amadeus Mozart', years: '1756–1791', alt: [],
    facts: [
      'He composed a cheerfully vulgar canon whose title translates politely as "Kiss my rear."',
      'He kept a pet starling that could whistle the theme of his Piano Concerto No. 17 — and gave it a full funeral.',
      'At fourteen he transcribed Allegri\'s closely guarded "Miserere" from memory after hearing it once in the Sistine Chapel.',
      'He toured Europe as a child prodigy from age six, playing blindfolded party tricks for empresses and kings.',
      'He died at 35 and was buried in an unmarked common grave in Vienna.',
      'Austrian prodigy of "The Magic Flute" and "Eine kleine Nachtmusik" — his middle name means "beloved of God."',
    ],
  },
  {
    name: 'Ludwig van Beethoven', years: '1770–1827', alt: ['vanbeethoven'],
    facts: [
      'He reportedly counted out exactly sixty coffee beans for his cup every single morning.',
      'He was such a chaotic tenant that he moved house in Vienna more than sixty times.',
      'He scratched Napoleon\'s name off a symphony dedication so furiously he tore a hole in the manuscript.',
      'He kept composing masterpieces for years after going completely deaf.',
      'At one premiere he had to be turned around to see the ovation he could not hear.',
      'German titan behind "Für Elise," the "Moonlight" Sonata, and the most famous four notes in music: da-da-da-DUM.',
    ],
  },
  {
    name: 'Frédéric Chopin', years: '1810–1849', alt: [],
    facts: [
      'His heart is preserved in a jar of cognac, sealed inside a church pillar in Warsaw.',
      'Terrified of being buried alive, he asked for his body to be opened after death — hence the jar.',
      'He carried on a famous decade-long romance with a cigar-smoking novelist who wrote under a man\'s name.',
      'He gave only around thirty public concerts in his whole career, preferring candlelit salons.',
      'Nearly everything he wrote is for solo piano: nocturnes, mazurkas, polonaises, ballades.',
      'Polish-born "poet of the piano," composer of the "Minute" Waltz.',
    ],
  },
  {
    name: 'Pyotr Ilyich Tchaikovsky', years: '1840–1893', alt: ['chaikovsky', 'tschaikowsky'],
    facts: [
      'A wealthy widow bankrolled him for thirteen years on one strict condition: they must never meet.',
      'Early in his conducting career he gripped his chin while conducting, convinced his head might fall off.',
      'He trained as a lawyer and pushed papers at the Ministry of Justice before daring to study music.',
      'One of his overtures calls for real cannon fire — and church bells.',
      'He wrote the ballets "Swan Lake" and "The Sleeping Beauty."',
      'Russian Romantic whose "Nutcracker" owns every Christmas; first name Pyotr.',
    ],
  },
  {
    name: 'Antonio Vivaldi', years: '1678–1741', alt: [],
    facts: [
      'He was an ordained priest nicknamed for his flame-red hair.',
      'He stopped saying Mass almost immediately, citing a "tightness of the chest" — possibly asthma, possibly deadlines.',
      'He wrote most of his 500-odd concertos for the all-girl orchestra of a Venetian orphanage.',
      'One waggish critic claimed he didn\'t write 500 concertos, but the same concerto 500 times.',
      'His four most famous violin concertos each come with a matching sonnet, possibly written by him.',
      'Venetian Baroque composer of "The Four Seasons."',
    ],
  },
  {
    name: 'George Frideric Handel', years: '1685–1759', alt: ['haendel'],
    facts: [
      'He fought a sword duel with a fellow composer; legend says a brass button — or a thick opera score — stopped the blade.',
      'He was born the same year as two other giants, 1685, and never met the most famous of them.',
      'Born German, he became a naturalised British subject and is buried in Westminster Abbey.',
      'Legend claims the King rose to his feet during one of his choruses, and audiences have stood ever since.',
      'He wrote "Water Music" for a royal barge party floating down the Thames.',
      'Composer of "Messiah" and its Hallelujah chorus; first names George Frideric.',
    ],
  },
  {
    name: 'Joseph Haydn', years: '1732–1809', alt: [],
    facts: [
      'Phrenologists stole his skull days after burial; head and body were only reunited in 1954.',
      'He spent nearly thirty years in livery as court composer to a fabulously rich Hungarian princely family.',
      'He taught Beethoven, and Mozart called him "Papa."',
      'In one of his symphonies the musicians snuff their candles and exit one by one — a hint to the prince that the orchestra wanted a holiday.',
      'He is called the father of both the symphony (he wrote 104) and the string quartet.',
      'Austrian classical master of the "Surprise" Symphony; first name Joseph.',
    ],
  },
  {
    name: 'Johannes Brahms', years: '1833–1897', alt: [],
    facts: [
      'Legend has it he spent his teens playing piano in the rough dockside taverns of Hamburg.',
      'Leaving a party, he reportedly announced: "If there is anyone here I have not insulted, I apologize."',
      'He spent decades devoted to the brilliant pianist widow of his mentor — and burned their letters.',
      'Haunted by a certain predecessor\'s shadow, he took twenty-one years to finish his First Symphony.',
      'He wrote the world\'s most famous lullaby — yes, that one.',
      'Gloriously bearded German Romantic, one of the "Three Bs"; first name Johannes.',
    ],
  },
  {
    name: 'Franz Liszt', years: '1811–1886', alt: [],
    facts: [
      'Fans mobbed him for gloves, handkerchiefs, snapped piano strings, even his coffee dregs — the poet Heine coined a word for the mania.',
      'Women reportedly fainted at his concerts; he is often called the first rock star.',
      'He invented the modern piano recital: playing alone, from memory, with the piano turned sideways so the crowd saw his profile.',
      'Late in life he took minor holy orders and was addressed as Abbé.',
      'His daughter Cosima married Wagner — after leaving her first husband, his own star pupil.',
      'Hungarian virtuoso of the "Hungarian Rhapsodies" and "La Campanella"; first name Franz, surname not Schubert.',
    ],
  },
  {
    name: 'Franz Schubert', years: '1797–1828', alt: [],
    facts: [
      'His friends nicknamed him "Schwammerl" — "little mushroom." He stood barely five feet tall.',
      'His friends threw entire evening parties dedicated to nothing but his music.',
      'He wrote more than 600 songs, once reportedly eight in a single day.',
      'He died at 31, owning little more than his clothes and manuscripts, and asked to be buried near Beethoven.',
      'His Eighth Symphony is famous precisely because he never finished it.',
      'Viennese song master of "Ave Maria" and the "Trout" Quintet; first name Franz, surname not Liszt.',
    ],
  },
  {
    name: 'Robert Schumann', years: '1810–1856', alt: [],
    facts: [
      'He invented two imaginary alter egos — fiery Florestan and dreamy Eusebius — who "co-wrote" his music criticism.',
      'He wrecked his own hand, possibly with a homemade finger-strengthening contraption, ending his concert dreams.',
      'He founded a music journal and used it to launch the careers of Chopin and Brahms.',
      'He had to sue his piano teacher for permission to marry the man\'s daughter — and won.',
      'His wife Clara was the most celebrated concert pianist of the century.',
      'German Romantic who spent his last years in an asylum after leaping into the Rhine; first name Robert.',
    ],
  },
  {
    name: 'Richard Wagner', years: '1813–1883', alt: [],
    facts: [
      'He spent years fleeing across Europe from creditors — and from an arrest warrant for manning the barricades in Dresden.',
      'He composed in silk dressing gowns amid clouds of rose perfume, and wrote a small library of self-regarding prose.',
      'A besotted teenage king paid off his debts and later built a fairy-tale castle inspired by his operas.',
      'He built his own opera house, in a small Bavarian town, exclusively for his own works.',
      'His four-opera cycle about a magic ring runs some fifteen hours.',
      'German opera colossus of the "Ride of the Valkyries" and the wedding march "Here Comes the Bride."',
    ],
  },
  {
    name: 'Giuseppe Verdi', years: '1813–1901', alt: [],
    facts: [
      'Italian patriots chalked his surname on walls as a secret acronym for their king-in-waiting.',
      'The Milan Conservatory rejected him as a student; it is now named after him.',
      'He served, reluctantly, as a deputy in Italy\'s first national parliament.',
      'He called the retirement home he founded for aging musicians his "most beautiful work."',
      'He wrote "Rigoletto," "Aida," and "La traviata."',
      'Italy\'s opera king, composer of "La donna è mobile"; first name Giuseppe.',
    ],
  },
  {
    name: 'Claude Debussy', years: '1862–1918', alt: [],
    facts: [
      'His parents ran a china shop, and he never attended a regular school in his life.',
      'Hearing a Javanese gamelan at the 1889 Paris World\'s Fair permanently rewired his sense of harmony.',
      'His first wife shot herself (she survived) when he ran off with another woman.',
      'He loathed the label critics stuck on his music, a word borrowed from a school of French painters.',
      'He wrote "La Mer" while pointedly far from the sea, and a famously languid faun\'s afternoon.',
      'French composer of "Clair de lune"; first name Claude.',
    ],
  },
  {
    name: 'Maurice Ravel', years: '1875–1937', alt: [],
    facts: [
      'He refused the Légion d\'honneur; a rival quipped that while he refused it, all his music accepted it.',
      'A tiny, immaculate dandy, he collected mechanical toys and doted on his Siamese cats.',
      'He drove a munitions truck at the front in the First World War after being rejected as too slight to fly.',
      'He reportedly refused to teach Gershwin, asking why he\'d want to be a second-rate version of himself when he was already a first-rate Gershwin.',
      'He wrote a piano concerto for the left hand alone, for a pianist who lost his right arm in the war.',
      'French master orchestrator whose "Boléro" repeats one hypnotic tune for fifteen minutes; first name Maurice.',
    ],
  },
  {
    name: 'Igor Stravinsky', years: '1882–1971', alt: [],
    facts: [
      'Boston authorities allegedly threatened him with a fine over his unorthodox arrangement of "The Star-Spangled Banner."',
      'Picasso sketched him, and Coco Chanel hosted (gossip says: more than hosted) him.',
      'He reinvented himself across Russia, Switzerland, France, and finally Hollywood, dying in New York at 88.',
      'The premiere of one of his ballets caused a genuine riot in a Paris theatre in 1913.',
      'He wrote "The Firebird" and "Petrushka" for the Ballets Russes.',
      'Russian modernist of "The Rite of Spring"; first name Igor.',
    ],
  },
  {
    name: 'Sergei Rachmaninoff', years: '1873–1943', alt: ['rachmaninov', 'rakhmaninov'],
    facts: [
      'His enormous hands could span twelve piano keys — an interval most pianists can only roll.',
      'After critics savaged his First Symphony he fell silent for three years, until a hypnotist talked him back to the piano — and got the next concerto\'s dedication.',
      'He escaped revolutionary Russia in an open sled across the Finnish border, with little more than notebooks.',
      'A fellow composer described the famously dour giant as "a six-and-a-half-foot scowl."',
      'One of his piano melodies became the pop ballad "All by Myself."',
      'Last of the great Russian Romantics, of Piano Concerto No. 2 fame; first name Sergei, surname not Prokofiev.',
    ],
  },
  {
    name: 'Antonín Dvořák', years: '1841–1904', alt: [],
    facts: [
      'A hopeless trainspotter, he memorized locomotive timetables and befriended engine drivers; he also adored pigeons and steamships.',
      'He trained in his father\'s trade — butchery — before music won out.',
      'Brahms judged an obscure composition prize, discovered him, and personally arranged his big publishing break.',
      'An American patron lured him to New York to run a conservatory, where he championed Black spirituals as the future of American music.',
      'He wrote the "Slavonic Dances" and the tear-jerking "Humoresque."',
      'Czech composer of the "New World" Symphony; first name Antonín.',
    ],
  },
  {
    name: 'Edvard Grieg', years: '1843–1907', alt: [],
    facts: [
      'He carried a lucky clay frog in his pocket and rubbed it before every concert.',
      'A teenage illness collapsed one of his lungs; he composed on regardless, in a hut by a lake.',
      'His government granted him a lifetime pension; he lived at a villa called "Troll Hill."',
      'He is buried in a tomb carved into a cliff face beside a fjord.',
      'He wrote the incidental music for Ibsen\'s "Peer Gynt," including "Morning Mood."',
      'Norway\'s national composer, of "In the Hall of the Mountain King"; first name Edvard.',
    ],
  },
  {
    name: 'Gustav Mahler', years: '1860–1911', alt: [],
    facts: [
      'He once spent a four-hour walking session with Sigmund Freud, talking through his marriage.',
      'So afraid of the "curse of the ninth" that he disguised his real ninth symphony as a song cycle.',
      'His symphonies call for a giant hammer, offstage cowbells, and in one case around a thousand performers.',
      'In his lifetime he was more famous as a tyrannical opera conductor in Vienna and New York than as a composer.',
      'He composed only in summers, in tiny lakeside huts built to keep the world out.',
      'Austrian symphonist whose Adagietto scored "Death in Venice"; first name Gustav, surname not Holst.',
    ],
  },
  {
    name: 'Giacomo Puccini', years: '1858–1924', alt: [],
    facts: [
      'A chain-smoking speed fiend, he survived one of Italy\'s first recorded car crashes.',
      'As a poor young organist, legend says he pinched organ pipes and sold them for scrap — recomposing around the missing notes.',
      'He was happiest shooting waterfowl from a rowboat near his lakeside villa.',
      'He died with his final opera unfinished; at its premiere the conductor stopped mid-scene and said, "Here the maestro laid down his pen."',
      'He wrote "Tosca" and "Madama Butterfly."',
      'Italian opera composer of "La bohème" and "Nessun dorma"; first name Giacomo.',
    ],
  },
  {
    name: 'Felix Mendelssohn', years: '1809–1847', alt: ['mendelssohnbartholdy'],
    facts: [
      'At twenty he conducted a forgotten Bach Passion back to life, single-handedly igniting the Bach revival.',
      'He was also a gifted watercolour painter, a prolific letter-writer, and spoke several languages.',
      'Queen Victoria adored him and sang his songs with him at Buckingham Palace — one of her favourites was secretly by his sister.',
      'He wrote a masterpiece octet at sixteen and his Shakespeare overture at seventeen.',
      'His sister Fanny was an equally gifted composer whose works were sometimes published under his name.',
      'German Romantic whose "Wedding March" has ended a billion ceremonies; first name Felix.',
    ],
  },
  {
    name: 'Dmitri Shostakovich', years: '1906–1975', alt: ['schostakowitsch'],
    facts: [
      'During the purges he slept with a packed suitcase by the door, expecting arrest any night.',
      'He was a certified football referee and a fanatical Leningrad supporter.',
      'A newspaper editorial titled "Muddle Instead of Music" — likely blessed by Stalin himself — nearly ended him in 1936.',
      'Starving musicians premiered his Seventh Symphony in a besieged city and broadcast it at the encircling army.',
      'He signed his music with a four-note monogram spelling his initials in German notation.',
      'Soviet symphonist: fifteen symphonies, fifteen string quartets; first name Dmitri.',
    ],
  },
  {
    name: 'George Gershwin', years: '1898–1937', alt: [],
    facts: [
      'A high-school dropout, he started out as a "song plugger" hammering out sheet music for $15 a week.',
      'He asked two famous European composers for lessons; one reportedly asked how much he earned, then said he should be taking lessons from him instead.',
      'He was a serious painter and collected Kandinsky and Picasso; he died of a brain tumour at just 38.',
      'He wrote a full opera set among the Black community of Charleston\'s Catfish Row.',
      'His symphonic jazz postcard from Paris later became an Oscar-winning MGM musical.',
      'American composer of "Rhapsody in Blue"; brother Ira wrote the words.',
    ],
  },
  {
    name: 'Gustav Holst', years: '1874–1934', alt: [],
    facts: [
      'He called astrology his "pet vice" and cast horoscopes for friends.',
      'He paid his early bills playing trombone in seaside bands and opera pits.',
      'He taught music at a London girls\' school for nearly thirty years, composing in a soundproof room they built him.',
      'He and his best friend Vaughan Williams spent decades critiquing each other\'s drafts on long country walks.',
      'He wrote the tune for "In the Bleak Midwinter" — and came to resent how one orchestral suite eclipsed everything else.',
      'English composer whose "The Planets" gave us "Mars" and "Jupiter"; first name Gustav, surname not Mahler.',
    ],
  },
  {
    name: 'Erik Satie', years: '1866–1925', alt: [],
    facts: [
      'He claimed to eat only white foods: eggs, sugar, coconut, rice, and the mould off certain fruit.',
      'He bought seven identical grey velvet suits and wore nothing else for years — "The Velvet Gentleman."',
      'He founded his own one-man church in Montmartre and excommunicated his critics through its newsletter.',
      'After he died, friends entering his squalid room found two grand pianos stacked one on top of the other, plus scores of umbrellas.',
      'He wrote a piece with instructions implying it be repeated 840 times in a row.',
      'French eccentric behind the dreamy "Gymnopédies"; first name Erik.',
    ],
  },
  {
    name: 'Camille Saint-Saëns', years: '1835–1921', alt: [],
    facts: [
      'He wrote what is often called the first original film score, in 1908.',
      'At ten years old he offered, as an encore, to play any of Beethoven\'s 32 piano sonatas from memory.',
      'A restless polymath, he published on astronomy, archaeology, and botany, and wrote plays and poetry.',
      'He banned public performances of his own most famous work during his lifetime, fearing it made him look unserious.',
      'That suppressed work features lions, hens, an elephant, fossils, and one immortal swan.',
      'French composer of "The Carnival of the Animals" and the "Organ" Symphony; first name Camille.',
    ],
  },
  {
    name: 'Niccolò Paganini', years: '1782–1840', alt: [],
    facts: [
      'Rumour insisted he\'d sold his soul to the devil; the Church refused his body burial for decades.',
      'A compulsive gambler, he once pawned his violin to cover losses and had to borrow one for a concert.',
      'Modern doctors suspect a connective-tissue disorder gave him his freakishly flexible fingers.',
      'When strings snapped mid-concert — sometimes by his own sabotage — he\'d finish the piece on a single string.',
      'His 24 Caprices for solo violin became the theme-and-variations quarry for Liszt, Brahms, and Rachmaninoff.',
      'Italian demon of the violin; first name Niccolò.',
    ],
  },
  {
    name: 'Sergei Prokofiev', years: '1891–1953', alt: ['prokofieff'],
    facts: [
      'He died the same day as Stalin; Moscow\'s flowers were requisitioned, so his funeral had almost none.',
      'A ranked chess player, he once beat world champion Capablanca in a simultaneous exhibition.',
      'He wrote his first opera, "The Giant," at the age of nine.',
      'He scored Eisenstein\'s film "Alexander Nevsky" and the ballet "Romeo and Juliet."',
      'He wrote a symphony in deliberate homage to Haydn, nicknamed the "Classical."',
      'Russian composer of "Peter and the Wolf"; first name Sergei, surname not Rachmaninoff.',
    ],
  },
  {
    name: 'Georges Bizet', years: '1838–1875', alt: [],
    facts: [
      'He won the Prix de Rome at nineteen but spent much of his short life grinding out piano arrangements to pay the bills.',
      'He wrote a dazzling symphony at seventeen, then shelved it; it went unperformed until 1935, sixty years after his death.',
      'His masterpiece flopped at its 1875 premiere, dismissed by critics as scandalous and vulgar.',
      'He died at just 36, three months after that premiere, never knowing the work would become one of the most performed operas ever.',
      'That opera gave the world the "Habanera" and the "Toreador Song."',
      'French composer of the opera "Carmen"; first name Georges.',
    ],
  },
  {
    name: 'Gioachino Rossini', years: '1792–1868', alt: ['gioacchinorossini'],
    facts: [
      'He wrote one famous overture so fast, legend says, that he tossed finished pages out the window to a copyist waiting below.',
      'A famous gourmand, he retired from opera at 37 and spent his last decades inventing recipes; a rich beef dish still bears his name.',
      'He supposedly composed one comic masterpiece in under three weeks.',
      'His overtures are built on a trademark slow-building orchestral crescendo that audiences nicknamed after him.',
      'One of his overtures — for an opera about a Swiss folk hero — became the galloping theme of "The Lone Ranger."',
      'Italian opera composer of "The Barber of Seville" and "William Tell"; first name Gioachino.',
    ],
  },
  {
    name: 'Jean Sibelius', years: '1865–1957', alt: [],
    facts: [
      'For the last thirty years of his life he published almost nothing, in what admirers call his "silence."',
      'He reportedly burned the manuscript of his Eighth Symphony in his own dining-room fireplace.',
      'His government granted him a lifetime pension at 32 so he could compose without teaching.',
      'His tone poems draw on the "Kalevala," his country\'s national epic.',
      'One of his patriotic tone poems became an unofficial anthem of his country\'s independence, its hymn-like tune sung the world over.',
      'Finland\'s national composer, of "Finlandia" and "Valse triste"; first name Jean.',
    ],
  },
  {
    name: 'Nikolai Rimsky-Korsakov', years: '1844–1908', alt: ['rimskykorsakov', 'korsakov', 'rimsky'],
    facts: [
      'He began his career as a naval officer, composing his first symphony during a three-year voyage at sea.',
      'A master of orchestral colour, he wrote the textbook on orchestration that generations of composers learned from.',
      'He belonged to a nationalist group of five Russian composers and tidied up the unfinished scores his friends left behind.',
      'He taught the young Stravinsky, and his symphonic suite retells "One Thousand and One Nights."',
      'His whirring showpiece depicting a certain insect\'s frantic flight is a rite of passage for virtuosos.',
      'Russian orchestral wizard of "Scheherazade" and "Flight of the Bumblebee"; first name Nikolai.',
    ],
  },
  {
    name: 'Modest Mussorgsky', years: '1839–1881', alt: ['moussorgsky', 'musorgsky'],
    facts: [
      'A member of a nationalist circle, he had almost no formal training and worked as a low-ranking civil servant.',
      'Alcoholism wrecked his health; a famous portrait, painted days before his death at 42, shows him bloated and red-nosed.',
      'His rough-hewn masterpieces were "corrected" and re-orchestrated by his tidier friend, who thought them crude.',
      'He wrote a piano suite depicting a walk through a friend\'s memorial art show, later famously orchestrated by Ravel.',
      'His witches\'-sabbath tone poem became a Halloween staple after Disney used it in "Fantasia."',
      'Russian composer of "Pictures at an Exhibition" and "Night on Bald Mountain"; first name Modest.',
    ],
  },
  {
    name: 'Edward Elgar', years: '1857–1934', alt: [],
    facts: [
      'Largely self-taught, he worked for years as a small-town bandmaster and violin teacher before fame found him in his forties.',
      'A keen amateur chemist, he once blew up a homemade contraption in his backyard "laboratory."',
      'His breakthrough was a set of orchestral variations, each portraying a friend behind a musical riddle he never fully explained.',
      'One of those variations, "Nimrod," is now a fixture at British funerals and memorials.',
      'The grand tune of his first "Pomp and Circumstance" march became "Land of Hope and Glory" and every graduation processional.',
      'English composer of the "Enigma Variations" and the "Pomp and Circumstance" marches; first name Edward.',
    ],
  },
  {
    name: 'Johann Strauss II', years: '1825–1899', alt: ['strauss', 'johannstrauss', 'straussii'],
    facts: [
      'His father, a famous musician of the same name, forbade him a musical career — so his mother secretly encouraged the boy.',
      'He turned dance music into an art form, conducting his own orchestra while playing violin, and toured as far as Boston.',
      'He wrote an operetta about a masked-ball prank, "Die Fledermaus," still a New Year\'s Eve staple.',
      'Vienna crowned him with a royal nickname for his mastery of one whirling three-beat dance.',
      'His most famous waltz, evoking a great blue river, is practically Austria\'s second anthem.',
      'The "Waltz King," composer of "The Blue Danube"; first name Johann.',
    ],
  },
  {
    name: 'Hector Berlioz', years: '1803–1869', alt: [],
    facts: [
      'He trained as a medical student, fainting at his first dissection, before abandoning medicine for music against his family\'s wishes.',
      'He fell obsessively in love with a Shakespearean actress after seeing her onstage, and poured the obsession into a symphony before they had even met.',
      'That symphony tells a story: an artist poisons himself with opium and dreams he is executed for murdering his beloved.',
      'A visionary orchestrator, he wrote a Requiem calling for four brass bands at the corners of the orchestra.',
      'His "Symphonie fantastique" turns his beloved into a recurring melody, the idée fixe, that haunts all five movements.',
      'French Romantic pioneer of the "Symphonie fantastique"; first name Hector.',
    ],
  },
  {
    name: 'Bedřich Smetana', years: '1824–1884', alt: ['smetana'],
    facts: [
      'Like Beethoven, he went completely deaf yet kept composing some of his greatest music in total silence.',
      'He grew up speaking German and had to learn to write his native language properly as an adult nationalist.',
      'He is considered the founding father of his country\'s national music, celebrated in a cycle of six patriotic tone poems.',
      'His comic opera "The Bartered Bride" is a cornerstone of Czech theatre.',
      'One tone poem traces a river from two mountain springs down to the great city, its flowing main theme instantly recognizable.',
      'Czech nationalist composer of "The Moldau"; first name Bedřich.',
    ],
  },
  {
    name: 'Johann Pachelbel', years: '1653–1706', alt: [],
    facts: [
      'A German Baroque organist, he taught members of the Bach family and shaped the young Johann Sebastian.',
      'He wrote hundreds of works — chorales, fugues, and organ pieces — nearly all of them forgotten today.',
      'He is remembered essentially for a single piece, rediscovered and made wildly popular in the 1970s.',
      'That piece, for three violins over a repeating bass, cycles the same eight-note pattern nearly thirty times.',
      'His most famous work is the most-requested processional at weddings the world over.',
      'German Baroque composer of the ubiquitous wedding "Canon in D"; first name Johann.',
    ],
  },
  {
    name: 'Gabriel Fauré', years: '1845–1924', alt: ['faure'],
    facts: [
      'As director of the Paris Conservatoire he shook up its stuffy traditions, earning the nickname "Robespierre."',
      'Like Beethoven and Smetana, he grew tragically deaf in later years — and the deafness distorted pitch, so his own music sounded sour to him.',
      'He taught Ravel and a whole generation of French composers, bridging Romanticism and the modern age.',
      'His serene Requiem deliberately omits the terrifying "Dies irae," offering a lullaby of death instead.',
      'His stately, melancholy "Pavane" began as a piano piece and became one of his best-loved works.',
      'French composer of the "Pavane" and a gentle Requiem; first name Gabriel.',
    ],
  },
  {
    name: 'Jacques Offenbach', years: '1819–1880', alt: [],
    facts: [
      'German-born, he moved to Paris as a teenager and became the toast of the Second Empire, skewering it in satirical operettas.',
      'He started out as a cello virtuoso, dazzling salons before he turned to the stage.',
      'He practically invented the operetta, running his own theatre and churning out nearly a hundred stage works.',
      'His opera "The Tales of Hoffmann," left unfinished at his death, gave the world the swooning "Barcarolle."',
      'His "Galop infernal" is the frantic music every high-kicking Can-Can dancer moves to.',
      'French operetta king whose "Orpheus in the Underworld" gave us the Can-Can; first name Jacques.',
    ],
  },
  {
    name: 'Domenico Scarlatti', years: '1685–1757', alt: [],
    facts: [
      'Born the same year as Bach and Handel, he was one of a remarkable trio of Baroque genius.',
      'He spent most of his career far from his Italian homeland, at the royal courts of Portugal and then Spain.',
      'As harpsichord teacher to a princess who became Queen of Spain, he wrote hundreds of pieces for her alone.',
      'His daring keyboard writing demanded hand-crossings and lightning repeated notes that dazzle players still.',
      'One of his sonatas is nicknamed the "Cat\'s Fugue," after a theme a cat supposedly walked out on his keyboard.',
      'Italian Baroque master of 555 single-movement keyboard sonatas; first name Domenico.',
    ],
  },
  {
    name: 'Jean-Baptiste Lully', years: '1632–1687', alt: ['lulli'],
    facts: [
      'Born in Florence, he came to France as a teenager to help a noblewoman practise her Italian — and stayed to rule its music.',
      'He clawed his way to become the most powerful musician at the court of the Sun King, Louis XIV.',
      'His royal monopoly on opera was so tight that rivals could barely stage a note without his permission.',
      'With the playwright Molière he invented the comédie-ballet, fusing spoken theatre, dance, and music.',
      'He died of gangrene after stabbing his own foot with the heavy staff he pounded to keep time.',
      'Italian-born founder of French opera and Louis XIV\'s court composer; first name Jean-Baptiste.',
    ],
  },
  {
    name: 'Max Bruch', years: '1838–1920', alt: [],
    facts: [
      'A German Romantic, he was a respected conductor across Europe and later a revered professor of composition in Berlin.',
      'He poured his heart into grand choral works and operas, certain they would be his legacy.',
      'Instead the public adored a single early violin concerto so much that it eclipsed everything else he wrote.',
      'Bitterly, he had sold that concerto\'s rights cheaply and earned almost nothing from its enormous success.',
      'His setting of a Jewish prayer for cello led the Nazis to wrongly assume he was Jewish and ban his music.',
      'German Romantic famed for his First Violin Concerto in G minor and "Kol Nidrei"; first name Max.',
    ],
  },
  {
    name: 'Anton Bruckner', years: '1824–1896', alt: [],
    facts: [
      'A devout Austrian Catholic of humble village roots, he began as a schoolteacher and church organist.',
      'A renowned organ improviser, he thrilled audiences in Paris and London though he published little for the instrument.',
      'He idolised Wagner so completely that he dedicated a symphony to him as "the master of all masters."',
      'Wracked by self-doubt, he revised his vast symphonies over and over, leaving scholars tangled in rival versions.',
      'He suffered a counting obsession, compulsively tallying windows, stars, and even bars of music.',
      'Austrian symphonist and devout organist of the towering Seventh and unfinished Ninth; first name Anton.',
    ],
  },
  {
    name: 'Eugène Ysaÿe', years: '1858–1931', alt: [],
    facts: [
      'A Belgian violin virtuoso, in his prime he was hailed across the world as the "King of the Violin."',
      'Composers lined up to write for him: César Franck\'s Violin Sonata was a wedding gift to him.',
      'Chausson\'s "Poème" and Debussy\'s String Quartet were premiered or inspired by his playing.',
      'A shaking bow arm and failing health slowly pushed him from soloing toward conducting and composing.',
      'Late in life he wrote six unaccompanied violin sonatas, each dedicated to a great violinist friend.',
      'Belgian "King of the Violin" and composer of six solo violin sonatas; first name Eugène.',
    ],
  },
];

// Three extra facts per composer, slotted hard / medium / easy, so each game can
// deal a different — but still progressively more revealing — hand of six.
const EXTRA = {
  'Johann Sebastian Bach': [
    'As a young man he was reprimanded for a street brawl with a bassoonist he had insulted as a "nanny-goat player."',
    'Contemporaries prized him mainly as a keyboard virtuoso and organ inspector; his compositions were dismissed as old-fashioned.',
    'Late in life he played for Frederick the Great and spun a royal theme into "A Musical Offering."',
  ],
  'Wolfgang Amadeus Mozart': [
    'His letters to his cousin are so filthy that publishers censored them for over a century.',
    'A devoted billiards player, he reportedly worked out music in his head between shots.',
    'A famous play and film later suggested — falsely — that a jealous rival poisoned him.',
  ],
  'Ludwig van Beethoven': [
    'He once hurled a plate of stew at a waiter who brought the wrong dish.',
    'His "Immortal Beloved" letter, found after his death, still keeps scholars arguing over her identity.',
    'Some 20,000 Viennese lined the streets at his funeral; Schubert carried a torch.',
  ],
  'Frédéric Chopin': [
    'He carried a silver cup of Polish soil through his whole life abroad; it was sprinkled on his grave.',
    'Delacroix painted his portrait; the canvas was later cut in two and the halves hang in different museums.',
    'His funeral music was Mozart\'s Requiem — delayed two weeks because the church balked at women singers.',
  ],
  'Pyotr Ilyich Tchaikovsky': [
    'His childhood governess called the hypersensitive boy "a child of glass."',
    'He conducted at the opening concert of Carnegie Hall in 1891.',
    'His death days after his final symphony premiered — officially cholera — still fuels conspiracy theories.',
  ],
  'Antonio Vivaldi': [
    'He boasted he could compose a concerto faster than a copyist could write out its parts.',
    'He toured with an entourage including the young soprano Anna Girò, to considerable priestly scandal.',
    'He died a pauper in Vienna, and his music lay forgotten for nearly two centuries.',
  ],
  'George Frideric Handel': [
    'Mid-rehearsal, he threatened to throw a defiant diva out the window unless she sang as written.',
    'Blind in his final years, he kept conducting his oratorios from memory.',
    'Beethoven called him "the greatest composer that ever lived — I would kneel at his grave."',
  ],
  'Joseph Haydn': [
    'He was expelled from his choir school after snipping off another chorister\'s pigtail.',
    'Two triumphant London seasons brought him 12 new symphonies and a fortune.',
    'As he lay dying during the 1809 bombardment of Vienna, Napoleon posted an honor guard at his door.',
  ],
  'Johannes Brahms': [
    'On his daily walks he handed out candy to street children from his coat pockets.',
    'He burned dozens of his own works he judged unworthy of him.',
    'Offered a Cambridge doctorate, he refused it rather than cross the sea to collect it.',
  ],
  'Franz Liszt': [
    'Legend says Beethoven kissed the boy\'s forehead after hearing him play.',
    'He gave away most of his fortune and taught hundreds of students without fee.',
    'He died at Bayreuth, during the festival his son-in-law built.',
  ],
  'Franz Schubert': [
    'He slept in his spectacles so he could begin composing the instant he woke.',
    'He never heard most of his own symphonies performed.',
    'His epitaph mourns "a rich treasure, but even fairer hopes."',
  ],
  'Robert Schumann': [
    'He built pieces on ciphers — musical letters spelling the names of towns and women he loved.',
    'He and his wife kept a joint marriage diary, trading the pen week by week.',
    'When an unknown young Brahms knocked with a knapsack of manuscripts, he hailed him in print as music\'s messiah.',
  ],
  'Richard Wagner': [
    'His Newfoundland dog Robber shared the storm-tossed sea escape from creditors that inspired one of his operas.',
    'The king\'s own ministers forced him out of Munich, fearing his grip on the infatuated young monarch.',
    'His festival\'s operas run so long that cushions and scheduled dinner breaks are part of the tradition.',
  ],
  'Giuseppe Verdi': [
    'Between operas he ran his farm estate personally, proud of his vineyards and livestock.',
    'His wife and both infant children died within two years, just as his first comedy flopped.',
    'Nearly 30 years after seeming to retire, he stunned the world with two Shakespeare operas in his seventies.',
  ],
  'Claude Debussy': [
    'He won the Prix de Rome, then spent his residency calling the Villa Medici "abominable."',
    'He served as house pianist to Tchaikovsky\'s patroness, who called him "my little Frenchman."',
    'He was buried while German shells fell on Paris in 1918, with only a small cortège.',
  ],
  'Maurice Ravel': [
    'His fifth rejection from the Prix de Rome caused a scandal that toppled the Conservatoire\'s director.',
    'His American tour earnings went on silk shirts and long nights in Harlem jazz clubs.',
    'A brain disease finally left him unable to write down the music he said he still heard.',
  ],
  'Igor Stravinsky': [
    'He rewrote his early ballets decades later partly to reclaim the copyright royalties.',
    'He insisted on composing at the piano into old age — the fingers, he said, teach the ear.',
    'He chose burial in Venice, near the impresario who made him famous.',
  ],
  'Sergei Rachmaninoff': [
    'He was an avid early motorist and motorboat enthusiast, splurging concert fees on fast machines.',
    'Hollywood borrowed his Second Concerto so often it became shorthand for doomed romance.',
    'He died in Beverly Hills days before his 70th birthday, an American citizen for barely a month.',
  ],
  'Antonín Dvořák': [
    'Brahms, childless, offered him his fortune to move to Vienna; homesickness made him refuse.',
    'His "American" quartet was written in a Czech-speaking farm village in Iowa.',
    'He lies in Vyšehrad cemetery in Prague, buried among national heroes.',
  ],
  'Edvard Grieg': [
    'He locked away his only symphony marked "must never be performed" — it finally premiered in 1981.',
    'He toured Europe as a duo with his wife Nina, he at the piano, she singing his songs.',
    'Norway declared a day of national mourning when he died.',
  ],
  'Gustav Mahler': [
    'His summer routine was fixed: dawn swim, mountain hike, then hours alone composing in the hut.',
    'His wife Alma\'s admirers — Klimt, Gropius, Werfel — became a legend of their own.',
    'Banned by the Nazis, his symphonies were resurrected by Bernstein into concert-hall staples.',
  ],
  'Giacomo Puccini': [
    'A tragedy in his household — a maid\'s suicide amid false accusations — became a national scandal and lawsuit.',
    'His publisher treated him like a son and bankrolled his lakeside idyll for decades.',
    'At his death Italy declared national mourning, and his unfinished final opera was completed by another hand.',
  ],
  'Felix Mendelssohn': [
    'A boat trip to a Scottish sea cave on Staffa gave him the theme of a famous overture.',
    'He founded Germany\'s first conservatory, in Leipzig, and hired Schumann to teach there.',
    'Grief at his beloved sister\'s death preceded his own fatal stroke by six months.',
  ],
  'Dmitri Shostakovich': [
    'He accompanied silent films on piano as a student — and was once fired for laughing at the screen.',
    'His memoirs, smuggled to the West after his death, ignited an authenticity war that still runs.',
    'He finally joined the Party late in life — a capitulation friends said left him in tears.',
  ],
  'George Gershwin': [
    'His first smash, "Swanee," sold a million copies after Al Jolson slipped it into a show.',
    'In Hollywood he played weekly tennis with the exiled Arnold Schoenberg.',
    'America\'s top prize for popular song is named after him and his lyricist brother.',
  ],
  'Gustav Holst': [
    'He once cycled through the Algerian desert on holiday, notebook in hand.',
    'A wartime YMCA posting sent him to Salonica to organize music for soldiers.',
    'His daughter became his biographer and a distinguished conductor in her own right.',
  ],
  'Erik Satie': [
    'He invented "furniture music" — music meant to be ignored — decades before elevators caught up.',
    'He walked the ten kilometres from suburban Arcueil into Paris nearly every night.',
    'Picasso designed the sets for his ballet "Parade," whose score calls for typewriters and sirens.',
  ],
  'Camille Saint-Saëns': [
    'He wintered for decades in Algiers, where he eventually died.',
    'After the Prussian war he founded a national society to champion French music.',
    'He stormed out of the "Rite of Spring" premiere, reportedly fuming about the opening bassoon.',
  ],
  'Niccolò Paganini': [
    'His mother said an angel had promised her he would become the world\'s greatest violinist.',
    'A Paris casino bearing his name flopped and wrecked what remained of his health.',
    'Berlioz wrote "Harold in Italy" for him; he rejected it, then knelt before Berlioz in public homage.',
  ],
  'Sergei Prokofiev': [
    'He fled revolution eastward — across Siberia and the Pacific — reaching America with a suitcase of scores.',
    'His opera "The Love for Three Oranges" premiered in Chicago; its march became a radio theme.',
    'He returned to Stalin\'s USSR in 1936 — the decision that framed the rest of his life.',
  ],
  'Georges Bizet': [
    'A formidable pianist, he could reportedly sight-read anything; Liszt named him one of only a handful in Europe who could.',
    'He married the daughter of his own composition teacher, the opera composer Fromental Halévy.',
    'Nietzsche championed his sunlit, Mediterranean music as the perfect cure, he said, for Wagner\'s fog.',
  ],
  'Gioachino Rossini': [
    'Crippling anxiety and depression shadowed his silent later years, even as he hosted glittering Saturday-night salons in Paris.',
    'His comic masterpiece flopped on opening night, partly sabotaged by fans of a rival\'s setting of the same play.',
    'He loved food so much that a lavish filet-and-foie-gras dish was named in his honour.',
  ],
  'Jean Sibelius': [
    'His ear was so acute he claimed to hear chords in the flight of cranes passing over his forest home, Ainola.',
    'A heavy drinker and heavy smoker, he outlived nearly all his contemporaries, dying at 91.',
    'His homeland put his face on its money and named its national music academy after him.',
  ],
  'Nikolai Rimsky-Korsakov': [
    'One of his operas was banned by the Tsar\'s censors for its satire and premiered only after his death.',
    'He completed and orchestrated the operas his friends left unfinished when they died.',
    'As a professor in St. Petersburg he taught the young Igor Stravinsky.',
  ],
  'Modest Mussorgsky': [
    'His opera "Boris Godunov" anchors the Russian repertoire, though he left it in several conflicting versions.',
    'He belonged to "The Mighty Handful," five Russians championing a national style over Western academicism.',
    'Ravel\'s dazzling orchestration turned one of his solo-piano suites into a concert-hall blockbuster.',
  ],
  'Edward Elgar': [
    'The "enigma" behind his variations — a hidden theme he claimed runs through them all — has never been definitively solved.',
    'His late Cello Concerto, written in grief after the First World War, was reborn decades later through Jacqueline du Pré.',
    'His bearded face appeared for years on the Bank of England twenty-pound note.',
  ],
  'Johann Strauss II': [
    'At an 1872 Boston festival he "conducted" a chorus of twenty thousand with a hundred assistant conductors relaying his beat.',
    'Brahms, an admirer, once autographed a lady\'s fan with a wistful joke that he wished he had written that famous waltz himself.',
    'His dances are the beating heart of Vienna\'s New Year\'s Concert, broadcast to the world every January 1.',
  ],
  'Hector Berlioz': [
    'Enraged by a broken engagement, he once set off across Europe disguised as a lady\'s maid, armed and plotting a double murder he thankfully abandoned.',
    'He wrote the era\'s definitive treatise on orchestration and championed a huge, vividly coloured orchestra.',
    'He eventually married the Shakespearean actress who had inspired his most famous symphony — and the marriage was miserable.',
  ],
  'Bedřich Smetana': [
    'His autobiographical string quartet ends with a piercing sustained high note — the tinnitus that heralded his deafness.',
    'He spent five years conducting in Sweden before returning home to lead his country\'s new national opera.',
    'The main theme of his river tone poem shares an old folk tune that also underlies the Israeli anthem "Hatikvah."',
  ],
  'Johann Pachelbel': [
    'Pop and rock guitarists know his repeating bass as the "four-chord progression" hiding inside countless hit songs.',
    'He was godfather to one of Johann Sebastian Bach\'s sisters and taught Bach\'s eldest brother.',
    'His three-hundred-year-old canon became inescapable at weddings after featuring in the 1980 film "Ordinary People."',
  ],
  'Gabriel Fauré': [
    'He composed mostly in summers, squeezing creation around exhausting duties as a church organist and teacher.',
    'A pillar of French song, he set the poems of Verlaine into some of the language\'s most beloved mélodies.',
    'His dreamy "Sicilienne" and the song "Après un rêve" are among his most-recorded melodies.',
  ],
  'Jacques Offenbach': [
    'Saint-Saëns borrowed his galloping Can-Can tune, slowed it to a crawl, and made it the plodding "Tortoises" in "The Carnival of the Animals."',
    'He died months before the premiere of his one grand opera, the work he hoped would outlast his comedies.',
    'That breakneck "Can-Can" galop is his most recognized music, a shorthand for Parisian cabaret.',
  ],
  'Domenico Scarlatti': [
    'He and Handel reportedly held a friendly contest in Rome — Handel judged the finer organist, he the finer harpsichordist.',
    'Only a small handful of his sonatas appeared in print in his lifetime, in a 1738 collection called "Essercizi."',
    'His own father was a towering opera composer, casting a long shadow over his early career.',
  ],
  'Jean-Baptiste Lully': [
    'A superb dancer, he performed alongside the young king himself in lavish court ballets.',
    'He essentially created the French overture, its stately dotted rhythms giving way to a lively fugue.',
    'Ambitious and ruthless, he made powerful enemies even as he amassed a fortune and noble titles.',
  ],
  'Max Bruch': [
    'He also wrote a "Scottish Fantasy" for violin, weaving in real Scottish folk tunes.',
    'A Protestant, his interest in that Jewish prayer melody was purely musical, not religious.',
    'He grew to resent violinists who only ever wanted to play that one famous concerto.',
  ],
  'Anton Bruckner': [
    'He numbered a discarded early symphony "0" — "Die Nullte" — and an even earlier one "00."',
    'He dedicated his final, unfinished symphony "to dear God."',
    'His grand, slow-building symphonies were often mocked in Vienna by critics loyal to Brahms.',
  ],
  'Eugène Ysaÿe': [
    'He led the Cincinnati Symphony Orchestra for several seasons in the 1910s and 1920s.',
    'His first solo sonata answers Bach\'s; another, titled "Obsession," is haunted by the "Dies irae."',
    'Near the end of his life he wrote an opera in the Walloon dialect of his native Liège.',
  ],
};
// Interleave: [f0, x0, f1, f2, x1, f3, f4, x2, f5] keeps the cryptic-to-giveaway slope.
for (const c of COMPOSERS) {
  const [f, e] = [c.facts, EXTRA[c.name]];
  c.facts9 = [f[0], e[0], f[1], f[2], e[1], f[3], f[4], e[2], f[5]];
}

// Strip case, diacritics, and non-letters so "Dvořák" matches "dvorak".
function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}

function aliases(c) {
  const parts = c.name.split(' ');
  return [norm(c.name), norm(parts[parts.length - 1]), ...c.alt.map(norm)];
}

function matchGuess(guess, composer) {
  const g = norm(guess);
  return g.length > 0 && aliases(composer).includes(g);
}

// Deterministic daily pick: days since 2026-01-01 (local date), scrambled with a coprime stride.
const EPOCH = Date.UTC(2026, 0, 1);
function dayNumber(date) {
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EPOCH) / 86400000);
}
function dailyIndex(date) {
  const n = COMPOSERS.length;
  return ((dayNumber(date) * 17 + 11) % n + n) % n;
}

if (typeof module !== 'undefined') module.exports = { COMPOSERS, norm, aliases, matchGuess, dayNumber, dailyIndex };
