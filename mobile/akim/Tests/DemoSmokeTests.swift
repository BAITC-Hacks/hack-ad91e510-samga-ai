import XCTest

@MainActor
final class DemoSmokeTests: XCTestCase {
    func testDemoJourney() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "kz.hackalem.akim")
        app.launch()
        XCTAssertTrue(app.buttons["login.demo"].waitForExistence(timeout: 40))
        app.buttons["login.demo"].tap()

        let story = app.buttons["feed.story.courtyard"]
        XCTAssertTrue(story.waitForExistence(timeout: 20))
        capture(app, "01-feed")
        story.tap()
        let headline = app.staticTexts["Во дворе на проспекте Кабанбай батыра завершили благоустройство"].firstMatch
        XCTAssertTrue(headline.waitForExistence(timeout: 10))
        XCTAssertGreaterThanOrEqual(headline.frame.minX, app.frame.minX)
        XCTAssertLessThanOrEqual(headline.frame.maxX, app.frame.maxX + 1)
        capture(app, "02-story-detail")

        app.tabBars.buttons["Карта"].tap()
        let pin = app.buttons["map.pin.park"]
        XCTAssertTrue(pin.waitForExistence(timeout: 30))
        capture(app, "03-map")
        pin.tap()
        XCTAssertTrue(app.navigationBars["Карточка объекта"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Двор: благоустройство"].exists)
        capture(app, "04-map-detail")
        app.buttons["Готово"].firstMatch.tap()

        app.tabBars.buttons["Чаты"].tap()
        let room = app.buttons["chat.room.city-headquarters"]
        XCTAssertTrue(room.waitForExistence(timeout: 10))
        room.tap()
        XCTAssertTrue(app.navigationBars["Городской штаб"].waitForExistence(timeout: 10))
        capture(app, "05-chat")
        app.buttons["Открыть план работ"].tap()
        XCTAssertTrue(app.staticTexts["План работ"].waitForExistence(timeout: 10))
        app.buttons["Готово"].firstMatch.tap()

        app.tabBars.buttons["Помощник"].tap()
        XCTAssertTrue(app.buttons["assistant.example.task"].waitForExistence(timeout: 10))
        capture(app, "06-assistant")
        app.buttons["assistant.example.task"].tap()
        XCTAssertTrue(app.staticTexts["Восстановление освещения во дворе"].waitForExistence(timeout: 10))
        app.buttons["Сохранить черновик"].tap()
        XCTAssertTrue(app.buttons["Сохранено в черновики"].waitForExistence(timeout: 10))
        capture(app, "07-generation")
        app.buttons["Готово"].firstMatch.tap()
        app.tabBars.buttons["События"].tap()
        app.navigationBars.buttons["Новости"].firstMatch.tap()
        XCTAssertTrue(app.buttons["feed.category.all"].waitForExistence(timeout: 10))
        capture(app, "08-final-feed")
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
