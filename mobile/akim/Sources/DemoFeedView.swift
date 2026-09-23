import SwiftUI

/// Демонстрационная лента городских задач. Данные существуют только в памяти приложения.
struct DemoFeedView: View {
    @State private var selectedCategory: FeedCategory = .all

    private var visibleStories: [DemoStory] {
        selectedCategory == .all ? DemoStory.samples : DemoStory.samples.filter { $0.category == selectedCategory }
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 16) {
                header
                morningBrief
                categoryPicker

                Text("События города")
                    .font(.title3.weight(.bold))
                    .padding(.horizontal, 20)

                ForEach(visibleStories) { story in
                    NavigationLink {
                        DemoStoryDetailView(story: story)
                    } label: {
                        StoryCard(story: story)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("feed.story.\(story.id)")
                    .padding(.horizontal, 20)
                }
            }
            .padding(.top, 12)
            .padding(.bottom, 28)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Новости")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Text("ДЕМО")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(AkimFeedTheme.accent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(AkimFeedTheme.accent.opacity(0.10), in: Capsule())
                    .accessibilityLabel("Демонстрационная версия")
            }
        }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Астана")
                    .font(.title2.weight(.bold))
                Text("23 сентября · 09:30")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "building.2.crop.circle.fill")
                .font(.system(size: 34))
                .foregroundStyle(AkimFeedTheme.accent)
                .accessibilityHidden(true)
        }
        .padding(.horizontal, 20)
    }

    private var morningBrief: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Label("Утренняя сводка", systemImage: "sun.max.fill")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text("Демо")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.86))
            }

            HStack(spacing: 0) {
                BriefMetric(value: "12", title: "обращений\nв работе")
                Divider().overlay(.white.opacity(0.24)).padding(.vertical, 2)
                BriefMetric(value: "4", title: "выездных\nконтроля")
                Divider().overlay(.white.opacity(0.24)).padding(.vertical, 2)
                BriefMetric(value: "86%", title: "готовность\nк сезону")
            }
        }
        .foregroundStyle(.white)
        .padding(18)
        .background {
            LinearGradient(
                colors: [AkimFeedTheme.accent, AkimFeedTheme.accent.opacity(0.78)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .padding(.horizontal, 20)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Демонстрационная утренняя сводка: 12 обращений в работе, 4 выездных контроля, готовность к сезону 86 процентов")
    }

    private var categoryPicker: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 9) {
                ForEach(FeedCategory.allCases) { category in
                    Button {
                        withAnimation(.snappy(duration: 0.25)) { selectedCategory = category }
                    } label: {
                        Text(category.title)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(selectedCategory == category ? .white : AkimFeedTheme.accent)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(selectedCategory == category ? AkimFeedTheme.accent : Color(uiColor: .secondarySystemGroupedBackground), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("feed.category.\(category.id)")
                    .accessibilityAddTraits(selectedCategory == category ? .isSelected : [])
                }
            }
            .padding(.horizontal, 20)
        }
        .scrollIndicators(.hidden)
    }
}

private struct BriefMetric: View {
    let value: String
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value)
                .font(.title2.weight(.bold).monospacedDigit())
            Text(title)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.78))
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 6)
    }
}

private struct StoryCard: View {
    let story: DemoStory

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            StoryArtwork(story: story, height: 174)

            VStack(alignment: .leading, spacing: 9) {
                HStack(spacing: 7) {
                    Text(story.category.title.uppercased())
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(story.category.tint)
                    Text("•")
                        .foregroundStyle(.tertiary)
                    Text(story.time)
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.tertiary)
                }

                Text(story.title)
                    .font(.headline)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.leading)

                Text(story.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
            .padding(16)
        }
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(.primary.opacity(0.055))
        }
        .shadow(color: .black.opacity(0.05), radius: 10, y: 3)
        .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct StoryArtwork: View {
    let story: DemoStory
    let height: CGFloat

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottomLeading) {
                Group {
                    switch story.image {
                    case .park:
                        Image("CityPark").resizable().scaledToFill()
                    case .road:
                        Image("CityRoad").resizable().scaledToFill()
                    case .hall:
                        Image("CivicHall").resizable().scaledToFill()
                    case .symbol(let name):
                        LinearGradient(colors: [story.category.tint.opacity(0.92), AkimFeedTheme.accent], startPoint: .topLeading, endPoint: .bottomTrailing)
                            .overlay {
                                Image(systemName: name)
                                    .font(.system(size: 50, weight: .medium))
                                    .foregroundStyle(.white.opacity(0.94))
                            }
                    }
                }
                .frame(width: geometry.size.width, height: height)

                LinearGradient(colors: [.clear, .black.opacity(0.48)], startPoint: .center, endPoint: .bottom)
                    .frame(width: geometry.size.width, height: height)
                Text(story.district)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 11)
                    .padding(.vertical, 6)
                    .background(.black.opacity(0.30), in: Capsule())
                    .padding(14)
            }
            .frame(width: geometry.size.width, height: height)
            .clipped()
        }
        .frame(height: height)
        .accessibilityHidden(true)
    }
}

private struct DemoStoryDetailView: View {
    let story: DemoStory
    @State private var isControlled = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                StoryArtwork(story: story, height: 260)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text(story.category.title.uppercased())
                            .font(.caption.weight(.bold))
                            .foregroundStyle(story.category.tint)
                        Spacer()
                        Text(story.time)
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.secondary)
                    }

                    Text(story.title)
                        .font(.title2.weight(.bold))

                    Text(story.body)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .lineSpacing(3)
                }

                VStack(alignment: .leading, spacing: 13) {
                    Text("Краткий итог")
                        .font(.headline)
                    ForEach(story.outcomes, id: \.self) { outcome in
                        Label(outcome, systemImage: "checkmark.circle.fill")
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                            .labelStyle(.titleAndIcon)
                            .symbolRenderingMode(.hierarchical)
                            .tint(AkimFeedTheme.accent)
                    }
                }
                .padding(16)
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                HStack(spacing: 8) {
                    Image(systemName: "info.circle")
                    Text("Источник: Демонстрационный сценарий")
                }
                .font(.footnote)
                .foregroundStyle(.secondary)

                Button {
                    withAnimation(.snappy(duration: 0.22)) { isControlled.toggle() }
                } label: {
                    Label(
                        isControlled ? "На контроле" : "Взять на контроль",
                        systemImage: isControlled ? "checkmark.circle.fill" : "eye.fill"
                    )
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 50)
                }
                .buttonStyle(.borderedProminent)
                .tint(isControlled ? .green : AkimFeedTheme.accent)
                .accessibilityIdentifier("feed.story.\(story.id).control")

                if isControlled {
                    Text("Статус сохранён только в этой демонстрационной сессии.")
                        .font(.footnote)
                        .foregroundStyle(.green)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .padding(20)
            .padding(.bottom, 28)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Text("ДЕМО")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(AkimFeedTheme.accent)
            }
        }
    }
}

private enum FeedCategory: String, CaseIterable, Identifiable {
    case all, city, appeals, tasks

    var id: String { rawValue }
    var title: String {
        switch self {
        case .all: "Все"
        case .city: "Город"
        case .appeals: "Обращения"
        case .tasks: "Поручения"
        }
    }

    var tint: Color {
        switch self {
        case .all, .city: AkimFeedTheme.accent
        case .appeals: .orange
        case .tasks: .indigo
        }
    }
}

private enum StoryImage {
    case park
    case road
    case hall
    case symbol(String)
}

private struct DemoStory: Identifiable {
    let id: String
    let category: FeedCategory
    let time: String
    let district: String
    let title: String
    let summary: String
    let body: String
    let outcomes: [String]
    let image: StoryImage

    static let samples: [DemoStory] = [
        DemoStory(id: "courtyard", category: .city, time: "09:15", district: "район Есиль", title: "Во дворе на проспекте Кабанбай батыра завершили благоустройство", summary: "Открыты новая детская площадка, тихая зона отдыха и освещённый проход.", body: "Во дворе жилого квартала завершён демонстрационный этап благоустройства. Жители получили безопасный маршрут к подъездам, новую площадку для детей и зелёную зону для отдыха.", outcomes: ["Обновлено покрытие пешеходных дорожек", "Установлено 18 светильников", "Площадка открыта для жителей"], image: .park),
        DemoStory(id: "heating", category: .tasks, time: "08:40", district: "район Алматы", title: "Готовность жилого фонда к отопительному сезону — 86%", summary: "Управляющим организациям направлен график завершения оставшихся работ.", body: "На утреннем совещании рассмотрели демонстрационные показатели готовности домов к отопительному сезону. Ответственным организациям установлен единый срок завершения профилактических мероприятий.", outcomes: ["Проверены тепловые пункты домов", "Согласован график контрольных выездов", "Статус обновляется в демо-ленте"], image: .hall),
        DemoStory(id: "road", category: .city, time: "Вчера, 17:20", district: "район Нура", title: "На улице Сыганак открыли обновлённый участок дороги", summary: "Завершены работы по покрытию, разметке и безопасному переходу у остановки.", body: "На демонстрационном участке дороги завершили плановые работы. Особое внимание уделили разметке возле остановки и организации безопасного перехода для пешеходов.", outcomes: ["Нанесена новая дорожная разметка", "Оборудован пешеходный переход", "Проверено вечернее освещение"], image: .road),
        DemoStory(id: "lighting", category: .appeals, time: "Вчера, 15:05", district: "жилой массив Коктал", title: "Обращение жителей об освещении передано в районную службу", summary: "Для дворового проезда назначен выездной осмотр в демонстрационном графике.", body: "Жители сообщили о недостаточном освещении дворового проезда. В демо-сценарии обращение принято, назначен осмотр и сформирован предварительный перечень работ.", outcomes: ["Обращение зарегистрировано", "Выезд запланирован на ближайший рабочий день", "Жителям будет доступен статус исполнения"], image: .symbol("lightbulb.max.fill")),
        DemoStory(id: "school-route", category: .tasks, time: "Вчера, 12:30", district: "район Байконыр", title: "Проверен безопасный маршрут к школе № 74", summary: "На маршруте предложили обновить знаки и добавить яркую разметку у перехода.", body: "Перед началом учебного дня специалисты прошли демонстрационный школьный маршрут вместе с представителями района. В список контроля внесены дорожные знаки, видимость перехода и подходы к школе.", outcomes: ["Осмотрен маршрут от жилого квартала", "Подготовлены предложения по знакам", "Переход включён в ближайший контроль"], image: .symbol("figure.walk.circle.fill")),
        DemoStory(id: "public-space", category: .appeals, time: "Понедельник, 18:10", district: "район Сарыарка", title: "Жители предложили обновить общественное пространство у парка", summary: "Идея направлена на оценку вместе с районным планом благоустройства.", body: "Инициатива жителей о благоустройстве общественного пространства принята в демонстрационной ленте. Предложение рассмотрят с учётом пешеходных маршрутов и доступности для семей.", outcomes: ["Предложение принято к рассмотрению", "Определены участники районной встречи", "Ответ будет отображён в статусе обращения"], image: .park)
    ]
}

private enum AkimFeedTheme {
    static let accent = Color(red: 12 / 255, green: 73 / 255, blue: 100 / 255)
}
