import SwiftUI
import PhotosUI

struct ComposeRequestView: View {
    @EnvironmentObject private var store: CitizenStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    let initialMode: InputMode
    @State private var page = 0
    @State private var pickerItem: PhotosPickerItem?
    @State private var camera = false
    @State private var showAI = false
    @State private var importing = false
    @State private var analyzing = false
    @State private var clarification = ""
    @State private var message: String?
    @State private var submitted: UUID?
    @State private var audio = VoiceCapture()
    @State private var draftSave: Task<Void, Never>?
    @FocusState private var editing: Bool

    private var hasContent: Bool {
        !store.state.draft.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.state.draft.photoData != nil || store.state.draft.demoPhoto != nil || store.state.draft.voiceData != nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    if let submitted { successView(submitted) }
                    else if page == 0 { inputView }
                    else { reviewView }
                }.padding(20)
            }
            .background(CitizenStyle.background)
            .navigationTitle(submitted == nil ? (page == 0 ? "Новое обращение" : "Проверьте и отправьте") : "Обращение сохранено")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(submitted == nil ? "Закрыть" : "Готово") { finishRecording(); store.save(); dismiss() }.disabled(analyzing)
                }
                ToolbarItem(placement: .topBarTrailing) { DemoBadge() }
            }
            .safeAreaInset(edge: .bottom) {
                if submitted == nil {
                    VStack(spacing: 6) {
                        Button {
                            editing = false
                            if page == 0 { store.save(); page = 1 }
                            else { var id: UUID?; if store.change({ id = try $0.submit() }) { submitted = id } }
                        } label: { Text(page == 0 ? "Продолжить" : "Отправить в демо").font(.headline).frame(maxWidth: .infinity, minHeight: 46) }
                            .buttonStyle(.borderedProminent)
                            .disabled(!hasContent || audio.recording || importing || analyzing || (page == 1 && store.state.draft.address.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty))
                        Text(page == 0 ? "Фото или голоса достаточно · текст необязателен" : "Сохранится на устройстве, без отправки в службы")
                            .font(.caption2).foregroundStyle(.secondary)
                    }.padding(.horizontal, 20).padding(.vertical, 10).background(.regularMaterial)
                }
            }
            .sheet(isPresented: $camera) { CameraCapture { photo in if let photo { setPhoto(photo) }; camera = false }.ignoresSafeArea() }
            .sheet(isPresented: $showAI) { AISettingsView() }
            .alert("Обращение", isPresented: Binding(get: { message != nil || audio.error != nil }, set: { if !$0 { message = nil; audio.error = nil } })) {
                Button("Понятно", role: .cancel) { message = nil; audio.error = nil }
            } message: { Text(message ?? audio.error ?? "") }
            .onChange(of: pickerItem) { _, selection in
                guard let selection else { return }
                importing = true
                Task { @MainActor in
                    defer { importing = false }
                    do {
                        guard let data = try await selection.loadTransferable(type: Data.self), let image = UIImage(data: data) else { message = "Не удалось открыть фотографию. Выберите другой снимок."; return }
                        setPhoto(image)
                    } catch { message = "Не удалось загрузить фото: \(error.localizedDescription)" }
                }
            }
            .onChange(of: audio.elapsed) { _, seconds in if seconds >= 120 { finishRecording() } }
            .onChange(of: store.state.draft) { _, _ in
                draftSave?.cancel()
                draftSave = Task { @MainActor in
                    do { try await Task.sleep(for: .milliseconds(500)); store.save() }
                    catch is CancellationError { /* A newer edit owns the pending save. */ }
                    catch { message = error.localizedDescription }
                }
            }
            .onChange(of: scenePhase) { _, phase in if phase == .background { finishRecording(); store.save() } }
            .onDisappear { draftSave?.cancel(); audio.cancelPendingStart(); finishRecording(); store.save() }
        }.interactiveDismissDisabled(analyzing || audio.recording || importing)
    }

    private var inputView: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Что нужно изменить?").font(.title2.weight(.bold))
                Text(initialMode == .voice ? "Нажмите микрофон и расскажите своими словами." : initialMode == .photo ? "Сфотографируйте место или выберите готовый снимок." : "Расскажите своими словами. Можно добавить фото или голос.")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            Picker("Тип обращения", selection: $store.state.draft.kind) { ForEach(RequestKind.allCases) { Text($0.rawValue).tag($0) } }.pickerStyle(.segmented)
            VStack(alignment: .leading, spacing: 12) {
                TextField("Например: вечером во дворе не горит фонарь…", text: $store.state.draft.text, axis: .vertical)
                    .lineLimit(4...8).font(.body).focused($editing).accessibilityLabel("Описание обращения, необязательно")
                Divider()
                HStack(spacing: 16) {
                    Button { openCamera() } label: { Label("Камера", systemImage: "camera").font(.subheadline).frame(minHeight: 44) }
                    PhotosPicker(selection: $pickerItem, matching: .images) { Label("Фото", systemImage: "photo").font(.subheadline).frame(minHeight: 44) }
                    Spacer(minLength: 0)
                    Button {
                        editing = false
                        if audio.recording { finishRecording() } else { Task { await audio.start() } }
                    } label: {
                        Image(systemName: audio.recording ? "stop.fill" : "mic.fill").font(.title3).foregroundStyle(.white).frame(width: 48, height: 48)
                            .background(audio.recording ? Color.red : CitizenStyle.accent, in: Circle())
                    }.accessibilityLabel(audio.recording ? "Остановить запись" : "Записать голосовое")
                }.disabled(analyzing || importing)
                if audio.recording { Label("Запись \(audio.elapsed / 60):\(String(format: "%02d", audio.elapsed % 60)) · до 2 минут", systemImage: "record.circle").font(.caption.weight(.medium)).foregroundStyle(.red) }
            }.padding(16).background(CitizenStyle.surface, in: RoundedRectangle(cornerRadius: 22))

            if importing { ProgressView("Добавляем фотографию…") }
            if store.state.draft.photoData != nil || store.state.draft.demoPhoto != nil {
                VStack(alignment: .leading, spacing: 6) {
                    CitizenPhoto(data: store.state.draft.photoData, asset: store.state.draft.demoPhoto).frame(height: 180).clipShape(RoundedRectangle(cornerRadius: 18))
                    HStack { Text(store.state.draft.demoPhoto == nil ? "Фотография приложена" : "Учебная иллюстрация").font(.caption).foregroundStyle(.secondary); Spacer(); Button("Убрать") { store.state.draft.photoData = nil; store.state.draft.demoPhoto = nil; store.state.draft.analysisSource = nil; store.save() }.font(.caption).frame(minHeight: 44) }
                }
            }
            if let data = store.state.draft.voiceData {
                HStack {
                    Button { audio.play(data) } label: { Label("Голосовое сообщение", systemImage: "play.circle.fill").frame(minHeight: 44) }
                    Spacer()
                    Button { store.state.draft.voiceData = nil; store.state.draft.transcript = ""; store.save() } label: { Image(systemName: "trash").frame(width: 44, height: 44) }.accessibilityLabel("Удалить голосовое")
                }.font(.subheadline).padding(12).background(CitizenStyle.surface, in: RoundedRectangle(cornerRadius: 16))
            }

            VStack(alignment: .leading, spacing: 12) {
                Label("Поможем сформулировать", systemImage: "sparkles").font(.headline)
                Text("ИИ предложит, что зафиксировано и что стоит исправить. Текст можно будет изменить.").font(.subheadline).foregroundStyle(.secondary)
                if analyzing { ProgressView("Готовим описание…") }
                else {
                    Button { if store.apiKey.isEmpty { showAI = true } else { Task { await analyze() } } } label: {
                        Label(store.apiKey.isEmpty ? "Подключить ИИ" : "Разобрать с ИИ", systemImage: "sparkles").frame(maxWidth: .infinity, minHeight: 36)
                    }.buttonStyle(.bordered).disabled((!store.apiKey.isEmpty && !hasContent) || audio.recording || importing)
                }
                if let source = store.state.draft.analysisSource { Text(source).font(.caption.weight(.medium)).foregroundStyle(CitizenStyle.accent) }
                if !clarification.isEmpty { Text(clarification).font(.subheadline.weight(.medium)) }
                if !store.apiKey.isEmpty { Text("По нажатию материалы обрабатываются OpenAI.").font(.caption2).foregroundStyle(.secondary) }
            }.padding(16).background(CitizenStyle.surface, in: RoundedRectangle(cornerRadius: 20))

            if !hasContent {
                Button { loadExample() } label: {
                    HStack { VStack(alignment: .leading, spacing: 4) { Text("Посмотреть пример").font(.subheadline.weight(.semibold)); Text("Фото → описание → результат").font(.caption).foregroundStyle(.secondary) }; Spacer(); Image(systemName: "play.circle") }.frame(minHeight: 48)
                }
            }
            Text("Черновик сохраняется при закрытии. Можно отправить материалы и без ИИ.").font(.caption).foregroundStyle(.secondary)
        }.disabled(analyzing)
    }

    private var reviewView: some View {
        VStack(alignment: .leading, spacing: 20) {
            Label("Осталось указать место", systemImage: "mappin.and.ellipse").font(.title3.weight(.bold))
            VStack(alignment: .leading, spacing: 14) {
                Picker("Район", selection: $store.state.draft.district) { ForEach(District.allCases) { Text($0.rawValue).tag($0) } }
                TextField("Улица, дом или ориентир", text: $store.state.draft.address).textContentType(.fullStreetAddress).frame(minHeight: 44)
                Text("Проверьте адрес. По фотографии нельзя надёжно определить место.").font(.caption).foregroundStyle(.secondary)
            }.padding(16).background(CitizenStyle.surface, in: RoundedRectangle(cornerRadius: 20))
            VStack(alignment: .leading, spacing: 12) {
                Text("Содержание обращения").font(.headline)
                TextField("Можно добавить описание", text: $store.state.draft.text, axis: .vertical).lineLimit(3...8)
                if store.state.draft.photoData != nil || store.state.draft.demoPhoto != nil { Label("1 фотография", systemImage: "photo").font(.subheadline).foregroundStyle(.secondary) }
                if store.state.draft.voiceData != nil { Label("Голосовое сообщение", systemImage: "waveform").font(.subheadline).foregroundStyle(.secondary) }
                if let source = store.state.draft.analysisSource { Text(source).font(.caption).foregroundStyle(.secondary) }
            }.padding(16).background(CitizenStyle.surface, in: RoundedRectangle(cornerRadius: 20))
            Button { page = 0 } label: { Label("Изменить материалы", systemImage: "arrow.left").frame(minHeight: 44) }
        }
    }

    private func successView(_ id: UUID) -> some View {
        VStack(alignment: .center, spacing: 20) {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 64)).foregroundStyle(CitizenStyle.accent).padding(.top, 20)
            Text("Ваше сообщение\nсохранено").font(.title.weight(.bold)).multilineTextAlignment(.center)
            if let item = store.state.requests.first(where: { $0.id == id }) { Text("Демо № \(item.number)").font(.headline).foregroundStyle(.secondary) }
            Text("Теперь можно посмотреть, как обращение проходит путь от рассмотрения до результата.").multilineTextAlignment(.center).foregroundStyle(.secondary)
            NavigationLink { RequestDetailView(id: id) } label: { Text("Открыть обращение").font(.headline).frame(maxWidth: .infinity, minHeight: 44) }.buttonStyle(.borderedProminent)
            Text("В этом показе данные хранятся только на устройстве. В городские службы ничего не отправлено.").font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }.frame(maxWidth: .infinity)
    }

    private func openCamera() {
        editing = false
        if UIImagePickerController.isSourceTypeAvailable(.camera) { camera = true }
        else { message = "В симуляторе нет камеры. Выберите фото из галереи или откройте учебный пример. На iPhone откроется камера." }
    }
    private func setPhoto(_ image: UIImage) {
        guard let data = resizedPhoto(image) else { message = "Не удалось подготовить фото."; return }
        store.state.draft.photoData = data; store.state.draft.demoPhoto = nil; store.state.draft.analysisSource = nil; store.save()
    }
    private func finishRecording() {
        guard audio.recording else { return }
        if let data = audio.stop() { store.state.draft.voiceData = data; store.state.draft.transcript = ""; store.save() }
    }
    private func loadExample() {
        store.state.draft.demoPhoto = "CityRoad"
        store.state.draft.text = "Прошу проверить безопасность перехода у школы: достаточно ли заметны знаки и разметка для водителей."
        store.state.draft.address = "У школы № 74 · учебный адрес"
        store.state.draft.category = "Безопасность перехода"
        store.state.draft.analysisSource = "Демо-пример: описание подготовлено заранее, это не распознавание фото."
        store.save()
    }
    private func analyze() async {
        analyzing = true; editing = false; defer { analyzing = false }
        do {
            var text = store.state.draft.text
            if let voice = store.state.draft.voiceData {
                let transcript = try await CitizenAI().transcribe(voice, key: store.apiKey)
                store.state.draft.transcript = transcript
                text += "\nГолосовое сообщение: " + transcript
            }
            let photo = store.state.draft.photoData ?? store.state.draft.demoPhoto.flatMap { UIImage(named: $0).flatMap(resizedPhoto) }
            let result = try await CitizenAI().analyze(text: text, photo: photo, key: store.apiKey)
            store.state.draft.text = result.summary; store.state.draft.category = result.category
            store.state.draft.analysisSource = "Описание предложено ИИ · проверьте перед отправкой"
            clarification = result.clarification; store.save()
        } catch { message = error.localizedDescription; store.save() }
    }
}
