import SwiftUI

/// Нативный список демонстрационных рабочих переписок.
/// Встраивается родителем в существующий `NavigationStack`.
struct DemoChatsView: View {
    @State private var query = ""

    private let rooms = DemoChatRoom.samples

    private var filteredRooms: [DemoChatRoom] {
        let needle = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return rooms }
        return rooms.filter {
            $0.title.localizedCaseInsensitiveContains(needle)
                || $0.preview.localizedCaseInsensitiveContains(needle)
        }
    }

    var body: some View {
        List {
            Section {
                ForEach(filteredRooms) { room in
                    NavigationLink {
                        DemoChatRoomView(room: room)
                    } label: {
                        DemoChatRow(room: room)
                    }
                    .accessibilityIdentifier("chat.room.\(room.id)")
                }
            } header: {
                Text("Демонстрационная переписка")
                    .textCase(nil)
            } footer: {
                Text("Сообщения созданы для демонстрации интерфейса и не связаны с действующими поручениями.")
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Чаты")
        .navigationBarTitleDisplayMode(.large)
        .searchable(text: $query, prompt: "Поиск чатов")
    }
}

private struct DemoChatRow: View {
    let room: DemoChatRoom

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: room.symbol)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(room.color)
                .frame(width: 48, height: 48)
                .background(room.color.opacity(0.13), in: Circle())
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(room.title)
                        .font(.body.weight(.semibold))
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    Text(room.time)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 6) {
                    Circle()
                        .fill(room.statusColor)
                        .frame(width: 7, height: 7)
                    Text(room.preview)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    if room.unreadCount > 0 {
                        Text("\(room.unreadCount)")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(minWidth: 20, minHeight: 20)
                            .background(AkimChatColor.accent, in: Capsule())
                    }
                }
            }
        }
        .padding(.vertical, 5)
        .accessibilityElement(children: .combine)
    }
}

private struct DemoChatRoomView: View {
    let room: DemoChatRoom
    @State private var messages: [DemoChatMessage]
    @State private var draft = ""
    @State private var replyIndex = 0
    @State private var showsPlan = false
    @FocusState private var composerIsFocused: Bool

    init(room: DemoChatRoom) {
        self.room = room
        _messages = State(initialValue: room.messages)
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    DemoChatNotice()
                    ForEach(messages) { message in
                        DemoMessageBubble(message: message, room: room) {
                            showsPlan = true
                        }
                        .id(message.id)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 12)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .scrollDismissesKeyboard(.interactively)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                composer
                    .background(.bar)
            }
            .onChange(of: messages.count) { _, _ in
                scrollToLatest(proxy, animated: true)
            }
            .onAppear { scrollToLatest(proxy, animated: false) }
        }
        .navigationTitle(room.title)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showsPlan) {
            DemoPlanSheet(room: room)
        }
    }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("Сообщение", text: $draft, axis: .vertical)
                .lineLimit(1...4)
                .textInputAutocapitalization(.sentences)
                .submitLabel(.send)
                .onSubmit(send)
                .focused($composerIsFocused)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .accessibilityIdentifier("chat.message")

            Button(action: send) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 31))
                    .foregroundStyle(canSend ? AkimChatColor.accent : Color.secondary.opacity(0.45))
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .disabled(!canSend)
            .accessibilityLabel("Отправить сообщение")
            .accessibilityIdentifier("chat.send")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    private var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func send() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        messages.append(DemoChatMessage(text: text, time: "сейчас", direction: .outgoing))
        draft = ""
        composerIsFocused = false
        let response = room.confirmations[replyIndex % room.confirmations.count]
        replyIndex += 1
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
            messages.append(DemoChatMessage(text: response, time: "сейчас", direction: .incoming))
        }
    }

    private func scrollToLatest(_ proxy: ScrollViewProxy, animated: Bool) {
        guard let lastID = messages.last?.id else { return }
        if animated {
            withAnimation(.easeOut(duration: 0.22)) { proxy.scrollTo(lastID, anchor: .bottom) }
        } else {
            proxy.scrollTo(lastID, anchor: .bottom)
        }
    }
}

private struct DemoChatNotice: View {
    var body: some View {
        Label("Демонстрационная переписка", systemImage: "info.circle")
            .font(.caption.weight(.medium))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: Capsule())
    }
}

private struct DemoMessageBubble: View {
    let message: DemoChatMessage
    let room: DemoChatRoom
    let openPlan: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 7) {
            if message.direction == .outgoing { Spacer(minLength: 48) }
            VStack(alignment: message.direction == .outgoing ? .trailing : .leading, spacing: 5) {
                if message.hasPlan {
                    Button(action: openPlan) {
                        DemoPlanAttachment(color: room.color)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Открыть план работ")
                }
                Text(message.text)
                    .font(.body)
                    .multilineTextAlignment(.leading)
                Text(message.time)
                    .font(.caption2)
                    .foregroundStyle(message.direction == .outgoing ? .white.opacity(0.74) : .secondary)
            }
            .padding(12)
            .background(message.direction == .outgoing ? AkimChatColor.accent : Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .foregroundStyle(message.direction == .outgoing ? .white : .primary)
            if message.direction == .incoming { Spacer(minLength: 48) }
        }
        .accessibilityIdentifier("chat.message")
    }
}

private struct DemoPlanAttachment: View {
    let color: Color

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "checklist")
                .font(.title3.weight(.semibold))
                .frame(width: 36, height: 36)
                .background(color.opacity(0.15), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text("План работ")
                    .font(.subheadline.weight(.semibold))
                Text("Открыть детали")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
        }
        .padding(9)
        .frame(minWidth: 220)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct DemoPlanSheet: View {
    @Environment(\.dismiss) private var dismiss
    let room: DemoChatRoom

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("План работ")
                    .font(.title2.weight(.bold))
                Spacer()
                Button("Готово") { dismiss() }
                    .frame(minHeight: 44)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 8)

            List {
                Section("Цель") { Text(room.planGoal) }
                Section("Шаги") {
                    ForEach(Array(room.planSteps.enumerated()), id: \.offset) { index, step in
                        Label(step, systemImage: "\(index + 1).circle.fill")
                            .foregroundStyle(index == 0 ? AkimChatColor.accent : .primary)
                    }
                }
                Section("Статус") {
                    Label("Демо-план: данные локальны", systemImage: "info.circle")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

private enum AkimChatColor {
    static let accent = Color(red: 12 / 255, green: 73 / 255, blue: 100 / 255)
}

private struct DemoChatRoom: Identifiable {
    let id: String
    let title: String
    let symbol: String
    let color: Color
    let statusColor: Color
    let preview: String
    let time: String
    let unreadCount: Int
    let messages: [DemoChatMessage]
    let confirmations: [String]
    let planGoal: String
    let planSteps: [String]

    static let samples: [DemoChatRoom] = [
        DemoChatRoom(id: "city-headquarters", title: "Городской штаб", symbol: "building.2.crop.circle", color: .blue, statusColor: .green, preview: "Сводка к 17:00 подготовлена", time: "17:12", unreadCount: 2, messages: [
            .init(text: "Коллеги, прошу до вечера сверить статусы по ключевым городским вопросам.", time: "16:28", direction: .outgoing),
            .init(text: "Сводка по районам собрана. Выносим только вопросы, где требуется решение штаба.", time: "16:34", direction: .incoming),
            .init(text: "Добавьте короткий план по каждому вопросу.", time: "16:36", direction: .outgoing),
            .init(text: "План работ приложен к сводке.", time: "16:48", direction: .incoming, hasPlan: true),
            .init(text: "Сводка к 17:00 подготовлена.", time: "17:12", direction: .incoming)
        ], confirmations: ["Подтверждаю: комментарий добавлен в демонстрационную сводку.", "Принято. Статус в этой переписке обновлён локально."], planGoal: "Согласовать сводку для демонстрационного заседания штаба.", planSteps: ["Собрать статусы направлений", "Выделить вопросы для решения", "Подготовить краткую сводку"]),
        DemoChatRoom(id: "improvement", title: "Благоустройство", symbol: "leaf.circle.fill", color: .green, statusColor: .orange, preview: "Уточняем график выездов", time: "16:40", unreadCount: 0, messages: [
            .init(text: "Нужен единый график осмотра дворовых территорий на неделю.", time: "15:50", direction: .outgoing),
            .init(text: "Черновик графика готов, уточняем выезды по секторам.", time: "16:03", direction: .incoming),
            .init(text: "Включите в первую очередь адреса из обращений жителей.", time: "16:09", direction: .outgoing),
            .init(text: "Принято. Уточняем график выездов.", time: "16:40", direction: .incoming)
        ], confirmations: ["Принято для демонстрации: приоритеты отмечены.", "Локальное подтверждение добавлено в чат."], planGoal: "Сформировать понятный график выездов по дворовым территориям.", planSteps: ["Сопоставить обращения и адреса", "Распределить выезды по дням", "Подтвердить маршрут обхода"]),
        DemoChatRoom(id: "transport", title: "Транспорт", symbol: "bus.fill", color: .orange, statusColor: .green, preview: "Маршруты проверены", time: "15:55", unreadCount: 1, messages: [
            .init(text: "Проверьте интервалы на утренних маршрутах и подготовьте предложение.", time: "15:08", direction: .outgoing),
            .init(text: "Пиковые интервалы отмечены, собираем варианты корректировки.", time: "15:22", direction: .incoming),
            .init(text: "Важно сохранить понятное информирование пассажиров.", time: "15:27", direction: .outgoing),
            .init(text: "Маршруты проверены, предложение будет в сводке.", time: "15:55", direction: .incoming)
        ], confirmations: ["Подтверждаю: замечание учтено в демонстрационном плане.", "Принято. Обновление отражено локально."], planGoal: "Подготовить варианты улучшения интервалов на востребованных маршрутах.", planSteps: ["Проверить интервалы в часы пик", "Согласовать варианты корректировки", "Подготовить сообщение для пассажиров"]),
        DemoChatRoom(id: "resident-appeals", title: "Обращения жителей", symbol: "bubble.left.and.bubble.right.fill", color: .purple, statusColor: .orange, preview: "На контроле 6 обращений", time: "14:30", unreadCount: 6, messages: [
            .init(text: "Покажите обращения, по которым жителям нужен ответ в первую очередь.", time: "13:42", direction: .outgoing),
            .init(text: "Сформирован список тем с ближайшими сроками ответа.", time: "14:05", direction: .incoming),
            .init(text: "Пусть ответ содержит срок и ответственного по каждому вопросу.", time: "14:11", direction: .outgoing),
            .init(text: "На контроле 6 обращений.", time: "14:30", direction: .incoming)
        ], confirmations: ["Демонстрационная отметка добавлена. Реальные обращения не используются.", "Принято: локальный статус обновлён."], planGoal: "Подготовить своевременные и понятные ответы по приоритетным обращениям.", planSteps: ["Определить обращения с ближайшим сроком", "Указать ответственного", "Проверить понятность ответа"]),
        DemoChatRoom(id: "heating", title: "Теплоснабжение", symbol: "thermometer.medium", color: .red, statusColor: .green, preview: "Проверка объектов завершена", time: "13:18", unreadCount: 0, messages: [
            .init(text: "Прошу подтвердить готовность объектов к сезонной проверке.", time: "12:35", direction: .outgoing),
            .init(text: "Проверка ключевых объектов завершена, замечания собраны.", time: "12:52", direction: .incoming),
            .init(text: "По замечаниям нужен порядок устранения и срок контроля.", time: "13:02", direction: .outgoing),
            .init(text: "Проверка объектов завершена.", time: "13:18", direction: .incoming)
        ], confirmations: ["Подтверждаю: комментарий сохранён только в демонстрационной переписке.", "Принято. Локальное подтверждение добавлено."], planGoal: "Согласовать порядок контроля замечаний по сезонной готовности.", planSteps: ["Сверить перечень замечаний", "Назначить контрольные даты", "Подготовить итоговую отметку"])
    ]
}

private struct DemoChatMessage: Identifiable {
    enum Direction { case incoming, outgoing }
    let id = UUID()
    let text: String
    let time: String
    let direction: Direction
    var hasPlan = false
}
