import SwiftUI

@main
struct CitizenApp: App {
    @StateObject private var store = CitizenStore()
    var body: some Scene { WindowGroup { CitizenRootView().environmentObject(store).tint(CitizenStyle.accent) } }
}

@MainActor
final class CitizenStore: ObservableObject {
    @Published var state: CitizenState
    @Published var error: String?
    // Demonstration-only connection: never encoded to disk or shipped as a built-in credential.
    @Published var apiKey = ""
    private let repository: CitizenRepository
    private var canSave = true

    init() {
        let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        repository = CitizenRepository(url: folder.appendingPathComponent("citizen-demo-v1.json"))
        if FileManager.default.fileExists(atPath: repository.url.path) {
            do { state = try repository.load() }
            catch { state = .demo; canSave = false; self.error = "Не удалось прочитать сохранённые обращения. Исходный файл сохранён. \(error.localizedDescription)" }
        } else { state = .demo }
    }

    func save() {
        guard canSave else { error = "Сохранение приостановлено, чтобы не заменить непрочитанные данные."; return }
        do { try repository.save(state) }
        catch { self.error = "Не удалось сохранить данные: \(error.localizedDescription)" }
    }

    @discardableResult
    func change(_ action: (inout CitizenState) throws -> Void) -> Bool {
        guard canSave else { save(); return false }
        do {
            var candidate = state
            try action(&candidate)
            try repository.save(candidate)
            state = candidate
            return true
        } catch { self.error = error.localizedDescription; return false }
    }

    func begin(_ kind: RequestKind) {
        if state.draft.text.isEmpty && state.draft.photoData == nil && state.draft.voiceData == nil && state.draft.demoPhoto == nil {
            state.draft = RequestDraft(kind: kind, district: state.district)
        }
    }
}

enum CitizenStyle {
    static let accent = Color(red: 0.025, green: 0.32, blue: 0.37)
    static let background = Color(uiColor: .systemGroupedBackground)
    static let surface = Color(uiColor: .secondarySystemGroupedBackground)
    static func status(_ stage: RequestStage) -> Color {
        switch stage { case .resolved: .green; case .awaitingConfirmation: .orange; case .inProgress: .blue; default: accent }
    }
}

struct CitizenRootView: View {
    @EnvironmentObject private var store: CitizenStore
    var body: some View {
        TabView {
            NavigationStack { DistrictHomeView() }.tabItem { Label("Мой район", systemImage: "house") }
            NavigationStack { CitizenMapView() }.tabItem { Label("Карта", systemImage: "map") }
            NavigationStack { MyRequestsView() }.tabItem { Label("Мои обращения", systemImage: "tray") }
            NavigationStack { CitizenProfileView() }.tabItem { Label("Профиль", systemImage: "person.crop.circle") }
        }
        .alert("Не удалось выполнить действие", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) {
            Button("Понятно", role: .cancel) { store.error = nil }
        } message: { Text(store.error ?? "") }
    }
}

struct DemoBadge: View {
    var body: some View {
        Text("ДЕМО").font(.caption2.weight(.bold)).tracking(0.8)
            .padding(.horizontal, 9).padding(.vertical, 6)
            .background(CitizenStyle.accent.opacity(0.1), in: Capsule()).foregroundStyle(CitizenStyle.accent)
            .accessibilityLabel("Локальная демонстрационная версия")
    }
}

struct DistrictPicker: View {
    @EnvironmentObject private var store: CitizenStore
    var body: some View {
        Menu {
            Picker("Район", selection: $store.state.district) { ForEach(District.allCases) { Text($0.rawValue).tag($0) } }
        } label: {
            Label("\(store.state.district.rawValue)", systemImage: "mappin.circle.fill").font(.subheadline.weight(.semibold)).frame(minHeight: 44)
        }.onChange(of: store.state.district) { _, _ in store.save() }
    }
}

struct StatusLabel: View {
    let stage: RequestStage
    var body: some View {
        Label(stage.title, systemImage: stage == .resolved ? "checkmark.circle.fill" : "circle.fill")
            .font(.caption.weight(.semibold)).foregroundStyle(CitizenStyle.status(stage))
            .padding(.horizontal, 9).padding(.vertical, 6)
            .background(CitizenStyle.status(stage).opacity(0.09), in: Capsule())
    }
}

struct CitizenPhoto: View {
    let data: Data?
    let asset: String?
    var body: some View {
        GeometryReader { box in
            Group {
                if let data, let photo = UIImage(data: data) { Image(uiImage: photo).resizable().scaledToFill() }
                else if let asset { Image(asset).resizable().scaledToFill() }
                else { ZStack { CitizenStyle.accent.opacity(0.07); Image(systemName: "text.bubble").font(.largeTitle).foregroundStyle(CitizenStyle.accent) } }
            }.frame(width: box.size.width, height: box.size.height).clipped()
        }
    }
}

struct RequestRow: View {
    let request: CivicRequest
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                CitizenPhoto(data: request.photoData, asset: request.demoPhoto).frame(width: 84, height: 90).clipShape(RoundedRectangle(cornerRadius: 14))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 6) {
                    Text(request.kind == .idea ? "ИДЕЯ ЖИТЕЛЕЙ" : "ГОРОДСКИЕ РАБОТЫ").font(.system(size: 10, weight: .bold)).tracking(1).foregroundStyle(CitizenStyle.accent)
                    Text(request.title).font(.headline).foregroundStyle(.primary).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                    Text(request.address).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                }
                Spacer(minLength: 0)
            }
            HStack(alignment: .center) {
                StatusLabel(stage: request.stage)
                Spacer(minLength: 4)
                Image(systemName: "arrow.up.right").font(.subheadline.weight(.semibold)).foregroundStyle(.secondary).accessibilityHidden(true)
            }
            Text(request.deadline).font(.caption).foregroundStyle(.secondary)
        }
        .padding(16).background(CitizenStyle.surface, in: RoundedRectangle(cornerRadius: 22))
        .contentShape(RoundedRectangle(cornerRadius: 22))
    }
}

struct DistrictHomeView: View {
    @EnvironmentObject private var store: CitizenStore
    @State private var composer = false
    @State private var input: InputMode = .text
    @State private var filter = 0
    private var requests: [CivicRequest] {
        store.state.requests.filter { $0.district == store.state.district && (filter == 0 || (filter == 1 ? $0.kind == .problem : $0.kind == .idea)) }
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("АСТАНА").font(.caption2.weight(.bold)).tracking(2).foregroundStyle(.secondary)
                        DistrictPicker()
                    }
                    Spacer()
                    Image("KazakhstanEmblem").resizable().scaledToFit().frame(width: 40, height: 40).accessibilityHidden(true)
                }
                VStack(alignment: .leading, spacing: 18) {
                    Text("Сделаем район лучше").font(.title2.weight(.bold))
                    Text("Покажите, расскажите или напишите,\nчто нужно изменить.").font(.subheadline).foregroundStyle(.white.opacity(0.9))
                    HStack(spacing: 10) {
                        entryButton("Фото", symbol: "camera.fill", mode: .photo)
                        entryButton("Голос", symbol: "waveform", mode: .voice)
                        entryButton("Текст", symbol: "text.alignleft", mode: .text)
                    }
                    Button { store.begin(.idea); store.state.draft.kind = .idea; input = .text; composer = true } label: {
                        HStack { Image(systemName: "lightbulb"); Text("Предложить идею"); Spacer(); Image(systemName: "arrow.right") }.font(.subheadline.weight(.medium)).frame(minHeight: 32)
                    }.foregroundStyle(.white)
                }
                .padding(20).foregroundStyle(.white)
                .background(LinearGradient(colors: [CitizenStyle.accent, Color(red: 0.02, green: 0.23, blue: 0.30)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 26))

                if !store.state.draft.text.isEmpty || store.state.draft.photoData != nil || store.state.draft.voiceData != nil {
                    Button { input = .text; composer = true } label: { Label("Продолжить черновик", systemImage: "square.and.pencil").font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity, minHeight: 44) }
                }
                HStack { Text("Что меняется рядом").font(.title3.weight(.bold)); Spacer() }
                Picker("Что показать", selection: $filter) { Text("Всё").tag(0); Text("Работы").tag(1); Text("Идеи").tag(2) }.pickerStyle(.segmented)
                if requests.isEmpty { ContentUnavailableView("Пока нет примеров", systemImage: "building.2", description: Text("Вы можете создать первое обращение для этого района.")) }
                ForEach(requests) { item in
                    NavigationLink { RequestDetailView(id: item.id) } label: { RequestRow(request: item) }.buttonStyle(.plain)
                }
                Text("Демонстрационные события и адреса. Обращения не отправляются в городские службы.").font(.caption).foregroundStyle(.secondary)
            }.padding(.horizontal, 20).padding(.vertical, 12)
        }
        .background(CitizenStyle.background).navigationTitle("Мой район").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarLeading) { Text("АКИМ").font(.caption.weight(.bold)).lineLimit(1).fixedSize().foregroundStyle(CitizenStyle.accent) }; ToolbarItem(placement: .topBarTrailing) { DemoBadge() } }
        .sheet(isPresented: $composer) { ComposeRequestView(initialMode: input) }
    }
    private func entryButton(_ title: String, symbol: String, mode: InputMode) -> some View {
        Button { store.begin(.problem); input = mode; composer = true } label: {
            VStack(spacing: 8) { Image(systemName: symbol).font(.title3); Text(title).font(.subheadline.weight(.semibold)) }
                .frame(maxWidth: .infinity, minHeight: 76).background(.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 16))
        }.foregroundStyle(.white)
    }
}

struct MyRequestsView: View {
    @EnvironmentObject private var store: CitizenStore
    @State private var filter = 0
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Ваши сообщения и ответы в одном месте").font(.subheadline).foregroundStyle(.secondary)
                Picker("Обращения", selection: $filter) { Text("Мои").tag(0); Text("Слежу").tag(1) }.pickerStyle(.segmented)
                let items = store.state.requests.filter { filter == 0 ? $0.isMine : $0.following }
                if items.isEmpty { ContentUnavailableView("Здесь пока пусто", systemImage: "tray", description: Text("Создайте обращение или нажмите «Следить» в карточке работ.")) }
                ForEach(items) { item in NavigationLink { RequestDetailView(id: item.id) } label: { RequestRow(request: item) }.buttonStyle(.plain) }
            }.padding(20)
        }.background(CitizenStyle.background).navigationTitle("Мои обращения")
    }
}
