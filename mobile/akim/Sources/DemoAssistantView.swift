import SwiftUI

private struct DemoGeneration: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let icon: String
    let tint: Color
    let prompt: String
    let heading: String
    let paragraphs: [String]
    let points: [String]
    let image: String?

    static let examples: [DemoGeneration] = [
        .init(id: "brief", title: "Утренняя сводка", subtitle: "Главное за день за одну минуту", icon: "sun.max.fill", tint: .orange, prompt: "Подготовь краткую сводку по городу на утро", heading: "Астана: три приоритета на сегодня", paragraphs: ["В демонстрационном сценарии основные вопросы дня — освещение во дворах, готовность к отоплению и безопасность школьных маршрутов."], points: ["Освещение: запросить срок восстановления линии и фото после ремонта.", "Отопление: сверить перечень объектов, по которым не завершена проверка.", "Школьный маршрут: провести выездной осмотр перехода до вечернего часа пик."], image: nil),
        .init(id: "task", title: "Проект поручения", subtitle: "Задача, ответственный и срок", icon: "checklist", tint: .blue, prompt: "Составь поручение по обращению о неработающих фонарях", heading: "Восстановление освещения во дворе", paragraphs: ["Поручить службе городского хозяйства обследовать линию освещения и устранить выявленные неисправности."], points: ["Ответственный: руководитель службы городского хозяйства.", "Срок первичного осмотра: сегодня до 17:00.", "Отчёт: причина неисправности, срок восстановления и фотографии результата.", "Контроль: городской штаб до подтверждения выполнения."], image: nil),
        .init(id: "reply", title: "Ответ жителю", subtitle: "Понятный ответ по обращению", icon: "text.bubble.fill", tint: .teal, prompt: "Подготовь ответ жителю по вопросу освещения", heading: "Проект ответа на обращение", paragraphs: ["Здравствуйте! Спасибо, что сообщили о неработающем освещении во дворе.", "В этом примере обращение передано профильной службе. Специалисты проверят линию и определят объём работ. После осмотра мы сообщим срок восстановления.", "По завершении работ результат будет проверен. Благодарим вас за участие в улучшении города."], points: ["Перед отправкой проверьте адрес, срок и фактический статус работ."], image: nil),
        .init(id: "vision", title: "Концепция двора", subtitle: "Визуальный пример благоустройства", icon: "photo.on.rectangle.angled", tint: .green, prompt: "Покажи, как может выглядеть обновлённый двор", heading: "Двор для прогулок и отдыха", paragraphs: ["Иллюстрация возможного благоустройства: пешеходные дорожки, озеленение и небольшая игровая зона. Изображение создано для демонстрации и не является проектной документацией."], points: ["Безбарьерные маршруты к подъездам.", "Освещение основных проходов.", "Деревья и места для спокойного отдыха."], image: "CityPark")
    ]
}

struct DemoAssistantView: View {
    @State private var selected: DemoGeneration?
    @State private var saved: Set<String> = []
    private let accent = Color(red: 12 / 255, green: 73 / 255, blue: 100 / 255)

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 12) {
                    Image(systemName: "sparkles").font(.system(size: 30))
                    Text("Меньше рутины.\nБольше внимания городу.").font(.title2.weight(.bold))
                    Text("Сводки, поручения и ответы\nв одном рабочем пространстве.").font(.subheadline).foregroundStyle(.white.opacity(0.82))
                }
                .foregroundStyle(.white)
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(LinearGradient(colors: [accent, Color(red: 6 / 255, green: 103 / 255, blue: 127 / 255)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 24))

                VStack(alignment: .leading, spacing: 12) {
                    Text("Примеры генерации").font(.title3.bold())
                    ForEach(DemoGeneration.examples) { example in
                        Button { selected = example } label: {
                            HStack(spacing: 14) {
                                Image(systemName: example.icon).font(.title3)
                                    .foregroundStyle(example.tint)
                                    .frame(width: 46, height: 46)
                                    .background(example.tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(example.title).font(.headline).foregroundStyle(.primary)
                                    Text(example.subtitle).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer(minLength: 4)
                                Image(systemName: saved.contains(example.id) ? "checkmark.circle.fill" : "chevron.right")
                                    .font(.subheadline).foregroundStyle(saved.contains(example.id) ? Color.green : Color.secondary)
                            }
                            .padding(16)
                            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18))
                        }.buttonStyle(.plain)
                            .accessibilityIdentifier("assistant.example.\(example.id)")
                    }
                }

                if !saved.isEmpty {
                    Label("Черновики: \(saved.count)", systemImage: "doc.text")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                Text("Готовые демонстрационные примеры. Внешняя AI-модель не подключена.")
                    .font(.caption).foregroundStyle(.secondary)
            }.padding(20)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Помощник")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Text("Демо").font(.caption).foregroundStyle(.secondary) } }
        .sheet(item: $selected) { example in
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        Label("Запрос", systemImage: "text.bubble").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                        Text(example.prompt).font(.subheadline).padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
                        HStack {
                            Label("Пример результата", systemImage: "sparkles").font(.caption.weight(.semibold)).foregroundStyle(accent)
                            Spacer()
                            Text("Демо").font(.caption).foregroundStyle(.secondary)
                        }
                        Text(example.heading).font(.title2.bold())
                        if let image = example.image {
                            Image(image).resizable().scaledToFit().clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        ForEach(example.paragraphs, id: \.self) { Text($0).font(.body).lineSpacing(4) }
                        ForEach(Array(example.points.enumerated()), id: \.offset) { index, point in
                            HStack(alignment: .top, spacing: 12) {
                                Text("\(index + 1)").font(.caption.weight(.bold)).foregroundStyle(accent)
                                    .frame(width: 25, height: 25).background(accent.opacity(0.1), in: Circle())
                                Text(point).font(.subheadline)
                            }
                        }
                        Button {
                            saved.insert(example.id)
                        } label: {
                            Label(saved.contains(example.id) ? "Сохранено в черновики" : "Сохранить черновик", systemImage: saved.contains(example.id) ? "checkmark" : "square.and.arrow.down")
                                .frame(maxWidth: .infinity)
                        }.buttonStyle(.borderedProminent).controlSize(.large)
                            .disabled(saved.contains(example.id))
                        Text("Материал создан для демонстрации. Перед использованием требуется проверка фактов.")
                            .font(.caption).foregroundStyle(.secondary)
                    }.padding(20)
                }
                .background(Color(uiColor: .systemGroupedBackground))
                .navigationTitle(example.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Готово") { selected = nil } } }
            }
        }
    }
}
