import XCTest

// Captures the App Store screenshot set by driving the real app in the simulator, so the
// images can never drift from what ships. Run on a 6.9" device (1320x2868) — see
// .github/workflows/screenshots.yml, which exports the attachments out of the .xcresult.
//
// Deliberately tolerant: every step is a soft check and navigation falls back to tapping by
// position. A run that captures four good screens and skips one is useful; one that fails the
// whole job because a label moved is not.
final class Screenshots: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = true
        app = XCUIApplication()
        app.launch()
        dismissWelcomeIfPresent()
    }

    // First launch shows the stage-name sheet. Skip it — the screenshots should show the game,
    // and an empty name field reads like an onboarding bug on a store page.
    private func dismissWelcomeIfPresent() {
        let skip = app.buttons["just browsing today"]
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

    func testCaptureAppStoreScreenshots() throws {
        // 1 — By Facts, clues on screen. Give the API a moment to deliver them.
        sleep(4)
        snap("01-by-facts")

        // 2 — By Ear: a recording plus the engraved score with the name inked out. The score is
        // a remote image, so this one needs the longest settle.
        openTab("By Ear", index: 1)
        sleep(6)
        snap("02-by-ear")

        // 3 — a hint revealed, showing the clue mechanic
        let hint = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'hint'")).firstMatch
        if hint.exists && hint.isHittable {
            hint.tap()
            sleep(3)
            snap("03-by-ear-hint")
        }

        // 4 — leaderboard
        openTab("Ranks", index: 2)
        sleep(4)
        snap("04-leaderboard")

        // 5 — profile and career stats
        openTab("Profile", index: 3)
        sleep(4)
        snap("05-profile")

        // 6 — the how-to sheet, which doubles as an explanation of the game on the store page
        let howto = app.buttons["How to play"]
        if howto.waitForExistence(timeout: 3) {
            howto.tap()
            sleep(2)
            snap("06-how-to-play")
        }
    }
}
