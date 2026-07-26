import XCTest

// Captures the App Store screenshot set by driving the real app in the simulator, so the
// images can never drift from what ships. Run on a 6.9" device (1320x2868) — see
// .github/workflows/screenshots.yml, which exports the attachments out of the .xcresult.
//
// The test plays a round before touching Profile, so the career panel shows real numbers
// instead of a freshly-installed zero state, and so the reveal screen gets captured.
//
// Deliberately tolerant: every step is a soft check, matched on a substring rather than an
// exact label, with a positional fallback. A run that captures six good screens and skips one
// is useful; one that fails the whole job because a glyph moved is not.
final class Screenshots: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = true
        app = XCUIApplication()
        app.launch()
        dismissWelcomeIfPresent()
    }

    // MARK: - helpers

    /// Match on a substring: exact labels carry musical glyphs and double spaces that are easy
    /// to get wrong and easy to change ("I need another clue  ♪", "Hint ♪ — costs a try").
    private func button(containing text: String) -> XCUIElement {
        app.buttons.containing(NSPredicate(format: "label CONTAINS[c] %@", text)).firstMatch
    }

    private func tapIfPossible(_ el: XCUIElement, settle: UInt32 = 2) -> Bool {
        guard el.exists, el.isHittable else { return false }
        el.tap()
        sleep(settle)
        return true
    }

    /// By Ear puts its controls below the score, so the useful buttons start off-screen and
    /// isHittable is false until scrolled to. Swipe until the element comes into reach.
    @discardableResult
    private func scrollTo(_ el: XCUIElement, maxSwipes: Int = 6) -> Bool {
        if el.exists && el.isHittable { return true }
        let scroll = app.scrollViews.firstMatch
        for _ in 0..<maxSwipes {
            if el.exists && el.isHittable { return true }
            if scroll.exists { scroll.swipeUp() } else { app.swipeUp() }
            sleep(1)
        }
        return el.exists && el.isHittable
    }

    // First launch shows the stage-name sheet. Skip it — screenshots should show the game, and
    // an empty name field reads like an onboarding bug on a store page.
    private func dismissWelcomeIfPresent() {
        let skip = button(containing: "just browsing")
        if skip.waitForExistence(timeout: 8) {
            skip.tap()
            sleep(1)
        }
    }

    private func snap(_ name: String) {
        let att = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        att.name = name
        att.lifetime = .keepAlways
        add(att)
    }

    /// Tab bar buttons are labelled in RootView; fall back to position if a label changes.
    private func openTab(_ label: String, index: Int) {
        let byLabel = app.tabBars.buttons[label]
        if byLabel.waitForExistence(timeout: 5) {
            byLabel.tap()
        } else {
            let bar = app.tabBars.firstMatch
            if bar.buttons.count > index { bar.buttons.element(boundBy: index).tap() }
        }
        sleep(3)   // let the tab's first network load settle
    }

    /// True once the round is over and the reveal sheet is up.
    private var revealVisible: Bool {
        app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS[c] 'Correct' OR label CONTAINS[c] 'Not this time'")
        ).firstMatch.exists
    }

    // MARK: - the run

    func testCaptureAppStoreScreenshots() throws {
        // 1 — By Facts with several clues showing. One clue alone looks sparse; three reads as
        // a real puzzle in progress.
        sleep(4)
        let clue = button(containing: "another clue")
        _ = tapIfPossible(clue, settle: 2)
        _ = tapIfPossible(clue, settle: 2)
        snap("01-by-facts")

        // 2 — By Ear: a recording plus the engraved score with the composer inked out. The score
        // is a remote image, so this needs the longest settle.
        openTab("By Ear", index: 1)
        sleep(6)
        snap("02-by-ear")

        // 3 — a hint revealed, showing the clue mechanic. The hint button sits below the score,
        // so it has to be scrolled to before it is tappable.
        let hint = button(containing: "Hint")
        scrollTo(hint)
        if tapIfPossible(hint, settle: 3) {
            snap("03-by-ear-hint")
        }

        // 4 — the reveal. "Give up" ends the round deterministically, which exhausting clues did
        // not: the clue button stops responding once the tries are spent, so the earlier loop
        // never reached the end of a round. Giving up on By Ear also produces the richer reveal —
        // composer, piece, performer and licence — and leaves Profile with a played game.
        let giveUp = button(containing: "Give up")
        scrollTo(giveUp)
        if tapIfPossible(giveUp, settle: 4) {
            if revealVisible {
                snap("04-reveal")
                if !tapIfPossible(button(containing: "Next"), settle: 2) {
                    app.swipeDown()
                    sleep(1)
                }
            }
        }

        // 5 — leaderboard
        openTab("Ranks", index: 2)
        sleep(4)
        snap("05-leaderboard")

        // 6 — profile, now with a played round behind it
        openTab("Profile", index: 3)
        sleep(3)
        snap("06-profile")

        // 7 — how-to sheet. The trigger is the "?" in the game-tab header, so go back to a
        // game tab first.
        openTab("By Facts", index: 0)
        sleep(2)
        if tapIfPossible(app.buttons["?"], settle: 2) {
            snap("07-how-to-play")
        }
    }
}
