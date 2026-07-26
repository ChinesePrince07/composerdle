import XCTest

// Full manual-style playthrough, captured step by step so the result can be reviewed rather
// than trusted. Distinct from Screenshots.swift: that one poses the app for the store, this one
// exercises it — naming, guessing, tier switching, audio, paging, hints, giving up, moderation
// controls and the sheets — and photographs each stage.
//
// Deliberately never taps "Delete my data": that wipes a real profile on the live backend.
final class Smoke: XCTestCase {

    private var app: XCUIApplication!
    private var step = 0

    override func setUpWithError() throws {
        continueAfterFailure = true
        app = XCUIApplication()
        app.launch()
    }

    // MARK: - helpers

    private func button(containing text: String) -> XCUIElement {
        app.buttons.containing(NSPredicate(format: "label CONTAINS[c] %@", text)).firstMatch
    }

    private func snap(_ name: String) {
        step += 1
        let att = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        att.name = String(format: "%02d-%@", step, name)
        att.lifetime = .keepAlways
        add(att)
    }

    @discardableResult
    private func tapIfPossible(_ el: XCUIElement, settle: UInt32 = 2) -> Bool {
        guard el.exists, el.isHittable else { return false }
        el.tap()
        sleep(settle)
        return true
    }

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

    private func openTab(_ label: String, index: Int) {
        let byLabel = app.tabBars.buttons[label]
        if byLabel.waitForExistence(timeout: 5) { byLabel.tap() }
        else {
            let bar = app.tabBars.firstMatch
            if bar.buttons.count > index { bar.buttons.element(boundBy: index).tap() }
        }
        sleep(3)
    }

    // MARK: - the playthrough

    func testFullPlaythrough() throws {
        // 1 — the welcome sheet exactly as a new player meets it. This is what the recent detent
        // work was for: the name field and its buttons must be visible without dragging.
        sleep(5)
        snap("welcome-sheet")

        // 2 — take a stage name, which is also how a leaderboard identity gets created
        let field = app.textFields.firstMatch
        if field.waitForExistence(timeout: 4), field.isHittable {
            field.tap()
            field.typeText("Simulator Smoke")
            snap("welcome-name-typed")
        }
        if !tapIfPossible(button(containing: "Take the stage"), settle: 3) {
            tapIfPossible(button(containing: "just browsing"), settle: 3)
        }
        snap("after-welcome")

        // 3 — By Facts: reveal a clue, then guess wrongly on purpose to prove the struck-off
        // list works
        sleep(3)
        let clue = button(containing: "another clue")
        tapIfPossible(clue, settle: 2)
        snap("facts-two-clues")

        let guessField = app.textFields.firstMatch
        if guessField.exists, guessField.isHittable {
            guessField.tap()
            guessField.typeText("Definitely Not A Composer")
            tapIfPossible(button(containing: "Guess"), settle: 3)
            snap("facts-wrong-guess")
        }

        // 4 — tier switching, which changes the pool the puzzle is drawn from
        if tapIfPossible(app.staticTexts["HARD"], settle: 3) {
            snap("facts-hard-tier")
        }

        // 5 — By Ear: score, transport, paging
        openTab("By Ear", index: 1)
        sleep(6)
        snap("ear-initial")

        // start the recording — the transport glyph flips once it plays
        if tapIfPossible(app.buttons.element(boundBy: 0), settle: 3) {
            snap("ear-playing")
        }

        if tapIfPossible(button(containing: "›"), settle: 2) {
            snap("ear-page-two")
        }

        // 6 — audio must stop when the tab changes. Leave, come back, and photograph the
        // transport: a paused clip shows the play glyph again.
        openTab("Ranks", index: 2)
        sleep(2)
        snap("ranks-while-audio-was-playing")
        openTab("By Ear", index: 1)
        sleep(3)
        snap("ear-returned-audio-should-be-paused")

        // 7 — hint, then give up to reach the reveal
        let hint = button(containing: "Hint")
        scrollTo(hint)
        if tapIfPossible(hint, settle: 3) { snap("ear-hint-spent") }

        let giveUp = button(containing: "Give up")
        scrollTo(giveUp)
        if tapIfPossible(giveUp, settle: 4) {
            snap("reveal-sheet")
            if !tapIfPossible(button(containing: "Next"), settle: 3) { app.swipeDown(); sleep(1) }
        }

        // 8 — leaderboard, plus the moderation controls a reviewer will look for
        openTab("Ranks", index: 2)
        sleep(4)
        snap("leaderboard")

        let firstRow = app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "1.")).firstMatch
        if firstRow.exists {
            firstRow.press(forDuration: 1.2)
            sleep(2)
            snap("leaderboard-report-block-menu")
            app.tap()   // dismiss without acting on anyone
            sleep(1)
        }

        // 9 — profile: career figures should reflect the round just played
        openTab("Profile", index: 3)
        sleep(4)
        snap("profile")

        // 10 — the how-to sheet, opened from the game-tab header
        openTab("By Facts", index: 0)
        sleep(2)
        if tapIfPossible(app.buttons["?"], settle: 3) {
            snap("how-to-sheet")
        }
    }
}
