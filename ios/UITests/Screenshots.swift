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

        // 2 — spend the remaining tries to reach the reveal. Each clue costs a try, so the round
        // ends on its own; this also leaves Profile with a played game to display.
        for _ in 0..<6 {
            if revealVisible { break }
            if !tapIfPossible(clue, settle: 2) { break }
        }
        if revealVisible {
            sleep(1)
            snap("02-reveal")
            // Dismiss so the tab bar is reachable again.
            if !tapIfPossible(button(containing: "Next"), settle: 2) {
                app.swipeDown()
                sleep(1)
            }
        }

        // 3 — By Ear: a recording plus the engraved score with the composer inked out. The score
        // is a remote image, so this needs the longest settle.
        openTab("By Ear", index: 1)
        sleep(6)
        snap("03-by-ear")

        // 4 — a hint revealed, showing the clue mechanic
        if tapIfPossible(button(containing: "Hint"), settle: 3) {
            snap("04-by-ear-hint")
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
