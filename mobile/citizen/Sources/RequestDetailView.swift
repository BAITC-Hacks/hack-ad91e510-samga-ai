import SwiftUI
import MapKit

struct RequestDetailView: View {
    @EnvironmentObject private var store: CitizenStore
    let id: UUID
    @State private var audio = VoiceCapture()
    private var item: CivicRequest? { store.state.requests.first { $0.id == id } }
    var body: some View {
        ScrollView {
            if let item {
                VStack(alignment: .leading, spacing: 22) {
                    if item.photoData != nil || item.demoPhoto != nil {
                        VStack(alignment: .leading, spacing: 6) {
                            CitizenPhoto(data: item.photoData, asset: item.demoPhoto).frame(height: 210).clipShape(RoundedRectangle(cornerRadius: 24))
                            if item.demoPhoto != nil { Text("Иллюстрация демо · не фото выполненной работы").font(.caption2).foregroundStyle(.secondary) }
                        }
                    }
                    StatusLabel(stage: item.stage)
                    Text(item.title).font(.title2.weight(.bold)).fixedSize(horizontal: false, vertical: true)
                    Label(item.address, systemImage: "mappin.and.ellipse").font(.subheadline).foregroundStyle(.secondary)
                    if !item.detail.isEmpty { Text(item.detail).font(.body) }
                    if let data = item.voiceData {
                        Button { audio.play(data) } label: { Label("Прослушать голосовое", systemImage: "play.circle.fill").frame(minHeight: 44) }
                    }
                    VStack(alignment: .leading, spacing: 10) {
                        Label(item.deadline, systemImage: "calendar").font(.subheadline.weight(.semibold))
                        Text("Ответственный в примере: районная служба благоустройства").font(.subheadline).foregroundStyle(.secondary)
                    }.padding(16).frame(maxWidth: .infinity, alignment: .leading).background(CitizenStyle.surface, in: RoundedRectangle(cornerRadius: 18))

                    if item.isMine && item.stage == .awaitingConfirmation {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Работа выполнена?").font(.headline)
                            Text("Это демонстрационный отчёт. В реальном обращении здесь будут фото и пояснение исполнителя.").font(.subheadline).foregroundStyle(.secondary)
                            Button { store.change { try $0.confirm(id, resolved: true) } } label: { Label("Да, всё исправлено", systemImage: "checkmark.circle").frame(maxWidth: .infinity, minHeight: 36) }.buttonStyle(.borderedProminent)
                            Button { store.change { try $0.confirm(id, resolved: false) } } label: { Text("Проблема осталась").frame(maxWidth: .infinity, minHeight: 36) }.buttonStyle(.bordered)
                        }.padding(18).background(CitizenStyle.surface, in: RoundedRectangle(cornerRadius: 20))
                    }

                    HStack(spacing: 12) {
                        Button { store.change { try $0.toggleSupport(id) } } label: {
                            Label(item.supported ? "Поддержано · \(item.supporters)" : "Поддержать · \(item.supporters)", systemImage: item.supported ? "hand.thumbsup.fill" : "hand.thumbsup").font(.subheadline).frame(minHeight: 44)
                        }
                        Spacer()
                        Button { store.change { s in if let i = s.requests.firstIndex(where: { $0.id == id }) { s.requests[i].following.toggle() } } } label: {
                            Label(item.following ? "Слежу" : "Следить", systemImage: item.following ? "bell.fill" : "bell").font(.subheadline).frame(minHeight: 44)
                        }
                    }
                    Text("История обращения").font(.title3.weight(.bold))
                    VStack(alignment: .leading, spacing: 18) {
                        ForEach(item.events.reversed()) { event in
                            HStack(alignment: .top, spacing: 12) {
                                Image(systemName: "checkmark.circle.fill").foregroundStyle(CitizenStyle.accent).padding(.top, 2)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(event.stage.title).font(.subheadline.weight(.semibold))
                                    Text(event.text).font(.subheadline).foregroundStyle(.secondary)
                                    Text(event.date, format: .dateTime.day().month().hour().minute()).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                    if item.stage.rawValue < RequestStage.awaitingConfirmation.rawValue {
                        Button { store.change { try $0.advanceDemo(id) } } label: { Label("Демо: показать следующий этап", systemImage: "play.rectangle").font(.subheadline).frame(maxWidth: .infinity, minHeight: 44) }.buttonStyle(.bordered)
                    }
                    Text("Демо № \(item.number) · данные только на этом устройстве. Поддержки и этапы в этом примере не являются ответом городских служб.").font(.caption).foregroundStyle(.secondary)
                }.padding(20)
            }
        }.background(CitizenStyle.background).navigationTitle("Обращение").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { DemoBadge() } }
    }
}

struct CitizenMapView: View {
    @EnvironmentObject private var store: CitizenStore
    @State private var camera: MapCameraPosition = .region(MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: 51.170, longitude: 71.447), span: MKCoordinateSpan(latitudeDelta: 0.045, longitudeDelta: 0.055)))
    @State private var selected: UUID?
    var body: some View {
        VStack(spacing: 0) {
            HStack { DistrictPicker(); Spacer(); Text("Учебные точки").font(.caption).foregroundStyle(.secondary) }.padding(.horizontal, 20)
            Map(position: $camera, selection: $selected) {
                ForEach(store.state.requests.filter { $0.district == store.state.district && $0.hasExactLocation }) { item in
                    Marker(item.title, systemImage: item.kind == .idea ? "lightbulb" : "wrench.and.screwdriver", coordinate: CLLocationCoordinate2D(latitude: item.latitude, longitude: item.longitude)).tint(CitizenStyle.status(item.stage)).tag(item.id)
                }
            }.mapControls { MapCompass(); MapScaleView() }
            .overlay(alignment: .topLeading) { Text("ДЕМО · расположение условное").font(.caption2.weight(.semibold)).padding(10).background(.regularMaterial, in: Capsule()).padding(12) }
            .safeAreaInset(edge: .bottom) {
                if let selected, let item = store.state.requests.first(where: { $0.id == selected }) {
                    NavigationLink { RequestDetailView(id: selected) } label: { RequestRow(request: item) }.buttonStyle(.plain).padding(12)
                } else {
                    Text("Нажмите на отметку, чтобы узнать, что делают и на каком этапе работа.").font(.subheadline).padding(18).frame(maxWidth: .infinity).background(.regularMaterial)
                }
            }
        }.navigationTitle("Рядом на карте").navigationBarTitleDisplayMode(.inline)
            .onChange(of: store.state.district) { _, district in
                selected = nil
                camera = .region(MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: district.latitude, longitude: district.longitude), span: MKCoordinateSpan(latitudeDelta: 0.045, longitudeDelta: 0.055)))
            }
    }
}

struct CitizenProfileView: View {
    @EnvironmentObject private var store: CitizenStore
    @State private var showAI = false
    var body: some View {
        Form {
            Section {
                Label("Житель Астаны", systemImage: "person.crop.circle.fill").font(.title3.weight(.semibold))
                Text("Демо без регистрации").foregroundStyle(.secondary)
            }
            Section("Ваш район") { Picker("Район", selection: $store.state.district) { ForEach(District.allCases) { Text($0.rawValue).tag($0) } } }
            Section("Помощь с обращением") {
                Button { showAI = true } label: { Label("Подключение ИИ", systemImage: "sparkles") }
                Text(store.apiKey.isEmpty ? "Доступен подписанный пример разбора. Для произвольных фото и речи подключите ИИ." : "Ключ введён для этой сессии. Готовность проверяется при анализе.").font(.caption).foregroundStyle(.secondary)
            }
            Section("Как устроена демонстрация") {
                Label("Фото, голос и текст", systemImage: "camera.on.rectangle")
                Label("Черновик сохраняется на устройстве", systemImage: "square.and.pencil")
                Label("Статусы можно пройти вручную", systemImage: "point.3.connected.trianglepath.dotted")
                Text("Отправка в городские службы и синхронизация с кабинетом акима пока не подключены. Выбранные «Слежу» доступны в разделе обращений; фоновых уведомлений нет.").font(.footnote).foregroundStyle(.secondary)
            }
        }.navigationTitle("Профиль").onChange(of: store.state.district) { _, _ in store.save() }
            .sheet(isPresented: $showAI) { AISettingsView() }
    }
}
