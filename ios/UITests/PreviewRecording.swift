import XCTest

// Performs the App Store preview on camera while `xcrun simctl io <device> recordVideo` films the
// simulator. The puzzles are pinned through the Debug-only launch environment read in Store.swift:
//   PREVIEW_FACTS_NONCE=appreviewaq → Beethoven; clue I = sixty coffee beans, clue II = Napoleon
//   PREVIEW_EAR_NONCE=apprevear4    → Symphony No. 5, I. Allegro con brio (a scored practice round)
// Both were found by running the server's own puzzle-selection code (api/_engine.js) offline and
// confirmed against the live API. Each beat prints "PREVIEW-MARK <name> <unix-time>" so the edit
// can cut on exact moments. Plays scored rounds as a throwaway simulator identity: delete that
// profile afterwards (DELETE /api/player with the simulator's cdle-token).
final class PreviewRecording: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = true
        app = XCUIApplication()
        app.launchEnvironment["PREVIEW_FACTS_NONCE"] = "appreviewaq"
        app.launchEnvironment["PREVIEW_EAR_NONCE"] = "apprevear4"
        app.launch()
    }

    // MARK: - helpers

    private func mark(_ name: String) {
        print(String(format: "PREVIEW-MARK %@ %.3f", name, Date().timeIntervalSince1970))
    }

    private func button(containing text: String) -> XCUIElement {
        app.buttons.containing(NSPredicate(format: "label CONTAINS[c] %@", text)).firstMatch
    }

    private func label(containing text: String) -> XCUIElement {
        app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", text)).firstMatch
    }

    private func hold(_ seconds: Double) { usleep(useconds_t(seconds * 1_000_000)) }

    /// Human typing speed, so each keystroke reads on camera.
    private func typeSlowly(_ field: XCUIElement, _ text: String) {
        for ch in text { field.typeText(String(ch)); hold(0.09) }
    }

    /// The software keyboard covers the controls; tapping empty page content dismisses it.
    private func dismissKeyboard() {
        for _ in 0..<3 where app.keyboards.element.exists {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.30)).tap()
            hold(0.6)
        }
    }

    // MARK: - the performance

    func testPerformPreview() throws {
        // pre-roll (cut in the edit): skip the stage-name sheet, wait for clue I
        let skip = button(containing: "just browsing")
        if skip.waitForExistence(timeout: 15) { skip.tap() }
        XCTAssertTrue(label(containing: "coffee beans").waitForExistence(timeout: 25), "clue I never loaded")
        hold(1.5)
        mark("facts-ready")
        hold(2.5)

        // a wrong guess, struck off the list
        let guess = app.textFields.firstMatch
        guess.tap(); hold(0.8)
        mark("type-mozart")
        typeSlowly(guess, "Mozart"); hold(0.4)
        button(containing: "Guess").tap()
        mark("mozart-guessed")
        hold(2.0)
        dismissKeyboard()

        // the next clue
        mark("ask-clue")
        button(containing: "another clue").tap()
        XCTAssertTrue(label(containing: "Napoleon").waitForExistence(timeout: 10), "clue II never arrived")
        mark("clue-two")
        hold(3.0)

        // the right answer, and the verdict
        guess.tap(); hold(0.8)
        mark("type-beethoven")
        typeSlowly(guess, "Beethoven"); hold(0.4)
        button(containing: "Guess").tap()
        mark("beethoven-guessed")
        XCTAssertTrue(label(containing: "Correct").waitForExistence(timeout: 10), "no facts verdict")
        mark("facts-verdict")
        hold(3.5)

        // leave the verdict for By Ear
        app.swipeDown(velocity: .fast); hold(1.0)
        if label(containing: "Correct").exists, button(containing: "Next").exists { button(containing: "Next").tap(); hold(1.0) }
        dismissKeyboard()
        app.tabBars.buttons["By Ear"].tap()
        let transport = app.buttons["transport"]
        XCTAssertTrue(transport.waitForExistence(timeout: 15), "By Ear never loaded")
        hold(2.5)                                   // the engraved score, name inked out
        mark("ear-ready")
        hold(1.5)

        // play the recording, turn a page
        transport.tap()
        mark("ear-play")
        hold(3.0)
        if button(containing: "›").exists { button(containing: "›").tap(); mark("ear-page-two"); hold(2.0) }

        // name the composer and the piece (points double when the piece is right)
        let composer = app.textFields.element(boundBy: 0)
        composer.tap(); hold(0.8)
        mark("type-ear-composer")
        typeSlowly(composer, "Beethoven"); hold(0.5)
        let piece = app.textFields.element(boundBy: 1)
        piece.tap(); hold(0.6)
        mark("type-ear-piece")
        typeSlowly(piece, "Symphony No. 5"); hold(0.5)
        piece.typeText("\n")                        // CDField submits on return
        mark("ear-guessed")
        if !label(containing: "Correct").waitForExistence(timeout: 8) {
            if button(containing: "See reveal").exists { button(containing: "See reveal").tap() }
        }
        XCTAssertTrue(label(containing: "Correct").waitForExistence(timeout: 8), "no By Ear verdict")
        mark("ear-verdict")
        hold(4.0)
        mark("end")
    }
}
