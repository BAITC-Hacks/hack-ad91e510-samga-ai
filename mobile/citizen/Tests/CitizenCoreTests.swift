import XCTest
@testable import CitizenCore

final class CitizenCoreTests: XCTestCase {
    func testPhotoOrVoiceCanBeSentWithoutTypingAndRecordNumbersStayUnique() throws {
        var state = CitizenState()
        state.draft.address = "Двор"
        state.draft.photoData = Data([1])
        let first = try state.submit()
        state.draft.address = "Парк"
        state.draft.voiceData = Data([2, 3])
        let second = try state.submit()
        XCTAssertNotEqual(first, second)
        XCTAssertEqual(state.requests.count, 2)
        XCTAssertEqual(state.requests[0].voiceData, Data([2, 3]))
        XCTAssertEqual(state.requests[0].number, 105)
        XCTAssertEqual(state.requests[1].photoData, Data([1]))
        XCTAssertEqual(state.requests[1].number, 104)
    }

    func testSubmissionValidatesAndRetainsDraftThenCreatesOwnedReceivedRequest() throws {
        var state = CitizenState()
        state.draft.text = "  Не горит фонарь  "
        XCTAssertThrowsError(try state.submit())
        XCTAssertEqual(state.draft.text, "  Не горит фонарь  ")
        state.draft.address = "  У дома 12  "
        state.draft.photoData = Data([1, 2, 3])
        let id = try state.submit()
        let request = try XCTUnwrap(state.requests.first)
        XCTAssertEqual(request.id, id)
        XCTAssertEqual(request.title, "Не горит фонарь")
        XCTAssertEqual(request.address, "У дома 12")
        XCTAssertEqual(request.stage, .received)
        XCTAssertTrue(request.isMine)
        XCTAssertEqual(request.photoData, Data([1, 2, 3]))
        XCTAssertEqual(request.number, 104)
        XCTAssertEqual(state.nextNumber, 105)
        XCTAssertEqual(state.draft.text, "")
    }

    func testDemoNeverResolvesWithoutResidentConfirmationAndCanReopen() throws {
        var state = CitizenState()
        state.draft.text = "Сломана скамейка"
        state.draft.address = "У дома 8"
        let id = try state.submit()
        XCTAssertThrowsError(try state.confirm(id, resolved: true))
        for _ in 0..<7 { try state.advanceDemo(id) }
        XCTAssertEqual(state.requests.first?.stage, .awaitingConfirmation)
        try state.confirm(id, resolved: false)
        XCTAssertEqual(state.requests.first?.stage, .inProgress)
        try state.advanceDemo(id)
        try state.confirm(id, resolved: true)
        XCTAssertEqual(state.requests.first?.stage, .resolved)
    }

    func testPhotoDraftAndRequestsSurviveDiskRoundTripAndSupportDoesNotInflate() throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        let repo = CitizenRepository(url: folder.appendingPathComponent("citizen.json"))
        var state = CitizenState()
        state.draft.kind = .idea
        state.draft.text = "Добавить освещение"
        state.draft.address = "Сквер"
        let id = try state.submit()
        try state.toggleSupport(id)
        XCTAssertEqual(state.requests.first?.supporters, 1)
        try state.toggleSupport(id)
        XCTAssertEqual(state.requests.first?.supporters, 0)
        state.draft.text = "Черновик"
        state.draft.photoData = Data([7, 8])
        try repo.save(state)
        let restored = try repo.load()
        XCTAssertEqual(restored.requests.first?.id, id)
        XCTAssertEqual(restored.draft.text, "Черновик")
        XCTAssertEqual(restored.draft.photoData, Data([7, 8]))
    }

    func testWhitespaceMessageRejectedAndMissingRecordFails() {
        var state = CitizenState()
        state.draft.text = " \n "
        state.draft.address = "Дом"
        XCTAssertThrowsError(try state.submit())
        XCTAssertThrowsError(try state.advanceDemo(UUID()))
        XCTAssertThrowsError(try state.toggleSupport(UUID()))
    }
}
