import Foundation

enum RequestKind: String, Codable, CaseIterable, Identifiable {
    case problem = "Проблема", idea = "Предложение"
    var id: String { rawValue }
}

enum District: String, Codable, CaseIterable, Identifiable {
    case baikonur = "Байконур", saryarka = "Сарыарка", esil = "Есиль", almaty = "Алматы", nura = "Нура"
    var id: String { rawValue }
    var latitude: Double { switch self { case .baikonur: 51.170; case .saryarka: 51.180; case .esil: 51.126; case .almaty: 51.153; case .nura: 51.119 } }
    var longitude: Double { switch self { case .baikonur: 71.447; case .saryarka: 71.404; case .esil: 71.430; case .almaty: 71.475; case .nura: 71.390 } }
}

enum RequestStage: Int, Codable, CaseIterable {
    case received, reviewing, planned, inProgress, awaitingConfirmation, resolved
    var title: String { ["Получено", "Рассматривается", "В плане", "В работе", "Ждёт вашей оценки", "Решено"][rawValue] }
    var explanation: String {
        ["Сообщение сохранено в демо. Следующий шаг — рассмотрение.", "В примере служба проверяет место и содержание обращения.", "Работа включена в демонстрационный план. Это ещё не выполненная работа.", "В примере исполнитель приступил к работе.", "В примере исполнитель сообщил о завершении. Проверьте результат.", "Житель подтвердил результат в демонстрации."][rawValue]
    }
}

struct RequestDraft: Codable, Equatable {
    var kind: RequestKind = .problem
    var district: District = .baikonur
    var category = "Благоустройство"
    var text = ""
    var address = ""
    var photoData: Data?
    var demoPhoto: String?
    var voiceData: Data?
    var transcript: String = ""
    var analysisSource: String?
}

struct RequestEvent: Codable, Identifiable {
    var id = UUID()
    var stage: RequestStage
    var text: String
    var date = Date()
}

struct CivicRequest: Codable, Identifiable {
    var id: UUID = UUID()
    var number: Int
    var kind: RequestKind
    var district: District
    var category: String
    var title: String
    var detail: String
    var address: String
    var stage: RequestStage
    var isMine: Bool
    var photoData: Data?
    var demoPhoto: String?
    var latitude: Double
    var longitude: Double
    var hasExactLocation = false
    var supporters = 0
    var supported = false
    var following = false
    var deadline: String = "Срок уточняется"
    var events: [RequestEvent] = []
    var voiceData: Data?
}

enum CitizenError: LocalizedError {
    case missingText, missingAddress, missingRequest, notAwaitingConfirmation
    var errorDescription: String? {
        switch self {
        case .missingText: "Коротко опишите проблему или предложение."
        case .missingAddress: "Укажите улицу, дом или ориентир."
        case .missingRequest: "Обращение не найдено."
        case .notAwaitingConfirmation: "Оценить результат можно после отчёта о выполнении своего обращения."
        }
    }
}

struct CitizenState: Codable {
    var requests: [CivicRequest] = []
    var draft = RequestDraft()
    var district: District = .baikonur
    var nextNumber = 104

    mutating func submit() throws -> UUID {
        let text = draft.text.trimmingCharacters(in: .whitespacesAndNewlines)
        let address = draft.address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty || draft.photoData != nil || draft.demoPhoto != nil || draft.voiceData != nil else { throw CitizenError.missingText }
        guard !address.isEmpty else { throw CitizenError.missingAddress }
        let title = text.isEmpty ? (draft.voiceData != nil ? "Голосовое обращение" : "Обращение с фотографией") : String(text.prefix(100))
        var request = CivicRequest(number: nextNumber, kind: draft.kind, district: draft.district, category: draft.category, title: title, detail: text, address: address, stage: .received, isMine: true, photoData: draft.photoData, demoPhoto: draft.demoPhoto, latitude: draft.district.latitude, longitude: draft.district.longitude)
        request.voiceData = draft.voiceData
        request.events = [RequestEvent(stage: .received, text: RequestStage.received.explanation)]
        requests.insert(request, at: 0)
        nextNumber += 1
        draft = RequestDraft(kind: draft.kind, district: draft.district)
        return request.id
    }

    mutating func advanceDemo(_ id: UUID) throws {
        guard let i = requests.firstIndex(where: { $0.id == id }) else { throw CitizenError.missingRequest }
        guard requests[i].stage.rawValue < RequestStage.awaitingConfirmation.rawValue else { return }
        let next = RequestStage(rawValue: requests[i].stage.rawValue + 1)!
        requests[i].stage = next
        requests[i].events.append(RequestEvent(stage: next, text: next.explanation))
    }

    mutating func confirm(_ id: UUID, resolved: Bool) throws {
        guard let i = requests.firstIndex(where: { $0.id == id }) else { throw CitizenError.missingRequest }
        guard requests[i].isMine, requests[i].stage == .awaitingConfirmation else { throw CitizenError.notAwaitingConfirmation }
        requests[i].stage = resolved ? .resolved : .inProgress
        requests[i].events.append(RequestEvent(stage: requests[i].stage, text: resolved ? "Вы подтвердили результат в демо." : "Вы сообщили, что проблема осталась. Обращение возвращено в работу."))
    }

    mutating func toggleSupport(_ id: UUID) throws {
        guard let i = requests.firstIndex(where: { $0.id == id }) else { throw CitizenError.missingRequest }
        requests[i].supported.toggle()
        requests[i].supporters = max(0, requests[i].supporters + (requests[i].supported ? 1 : -1))
    }
}

struct CitizenRepository {
    let url: URL
    func save(_ state: CitizenState) throws {
        try JSONEncoder().encode(state).write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
    }
    func load() throws -> CitizenState { try JSONDecoder().decode(CitizenState.self, from: Data(contentsOf: url)) }
}
