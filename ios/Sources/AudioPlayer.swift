import AVFoundation
import SwiftUI

// Thin AVPlayer wrapper. Streams the R2 mp3 and publishes time/duration/playing so
// the score view can auto-turn pages in step with the recording. Uses a MainActor
// polling task (not addPeriodicTimeObserver) to stay clean under Swift 6 strict
// concurrency — the observer block is @Sendable and can't capture main-actor state.
@MainActor
final class AudioPlayer: ObservableObject {
    @Published var time: Double = 0
    @Published var duration: Double = 0
    @Published var playing = false

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
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(300))
                guard let self, let p = self.player else { continue }
                self.time = p.currentTime().seconds
                if let d = p.currentItem?.duration.seconds, d.isFinite, d > 0 { self.duration = d }
                if let d = p.currentItem?.duration.seconds, d.isFinite, self.time >= d { self.playing = false }
            }
        }
    }

    func toggle() {
        guard let p = player else { return }
        if playing { p.pause(); playing = false }
        else { try? AVAudioSession.sharedInstance().setActive(true); p.play(); playing = true }
    }

    func stop() {
        ticker?.cancel(); ticker = nil
        player?.pause(); player = nil
        playing = false; time = 0; duration = 0; urlString = ""
    }
}
