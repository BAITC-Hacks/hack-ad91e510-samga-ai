import Foundation

extension CitizenState {
    static var demo: CitizenState {
        var state = CitizenState()
        let specifications: [(Int, RequestKind, District, String, String, String, RequestStage, Bool, String?, String, Double, Double)] = [
            (101, .problem, .baikonur, "Безопасный переход у школы", "Обновить разметку и установить знаки возле школьного перехода. В демонстрационном сценарии знаки уже установлены, следующий этап — разметка.", "У школы № 74 · учебная точка", .inProgress, true, "CityRoad", "План: 30 сентября", 51.169, 71.443),
            (102, .idea, .baikonur, "Больше света во дворе", "Предлагаем добавить освещение вдоль пешеходной дорожки. Так возвращаться домой вечером будет удобнее.", "Двор у жилого квартала · учебная точка", .reviewing, false, "CityPark", "Оценка: до 28 сентября", 51.176, 71.451),
            (103, .problem, .baikonur, "Скамейку отремонтировали", "Пример завершения обращения: исполнитель сообщил о ремонте. Теперь житель может оценить результат или вернуть обращение в работу.", "Сквер возле дома · учебная точка", .awaitingConfirmation, true, "CityPark", "Отчёт: 23 сентября", 51.164, 71.450),
            (201, .idea, .saryarka, "Зелёная зона для прогулок", "Предложение жителей: озеленить свободный участок и проложить удобную дорожку.", "Район Сарыарка · учебная точка", .planned, false, "CityPark", "Плановый срок уточняется", 51.180, 71.404),
            (301, .problem, .esil, "Обновление дорожной разметки", "Демонстрационный пример работ на пешеходном переходе.", "Район Есиль · учебная точка", .inProgress, false, "CityRoad", "План: 2 октября", 51.126, 71.430)
        ]
        state.requests = specifications.map { number, kind, district, title, detail, address, stage, mine, image, deadline, lat, lon in
            var item = CivicRequest(number: number, kind: kind, district: district, category: kind == .idea ? "Благоустройство" : "Городская среда", title: title, detail: detail, address: address, stage: stage, isMine: mine, demoPhoto: image, latitude: lat, longitude: lon, hasExactLocation: true, supporters: kind == .idea ? 24 : 8, deadline: deadline)
            item.events = RequestStage.allCases.filter { $0.rawValue <= stage.rawValue }.map {
                RequestEvent(stage: $0, text: $0.explanation, date: Date(timeIntervalSince1970: 1790060400 + Double($0.rawValue * 14400)))
            }
            return item
        }
        return state
    }
}
