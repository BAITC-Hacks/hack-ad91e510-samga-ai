import SwiftUI
import MapKit

private struct CityDemoPlace: Identifiable {
    let id: String
    let title: String
    let category: String
    let icon: String
    let color: Color
    let coordinate: CLLocationCoordinate2D
    let status: String
    let detail: String
    let team: String
    let image: String

    static let samples: [CityDemoPlace] = [
        .init(id: "park", title: "Двор: благоустройство", category: "Город", icon: "leaf.fill", color: .green, coordinate: .init(latitude: 51.132, longitude: 71.426), status: "Приёмка работ", detail: "Проверить освещение, покрытие дорожек и доступность детской площадки. Подрядчик подготовил фотоотчёт.", team: "Благоустройство", image: "CityPark"),
        .init(id: "road", title: "Ремонт дорожного покрытия", category: "Поручения", icon: "road.lanes", color: .orange, coordinate: .init(latitude: 51.145, longitude: 71.414), status: "В работе", detail: "Завершить разметку и проверить организацию движения у пешеходного перехода. Контрольный выезд — сегодня.", team: "Транспорт", image: "CityRoad"),
        .init(id: "light", title: "Обращение: освещение", category: "Обращения", icon: "lightbulb.fill", color: .red, coordinate: .init(latitude: 51.123, longitude: 71.443), status: "Требует внимания", detail: "В демонстрационном обращении жители сообщили о неработающих фонарях. Нужны обследование линии и согласование срока ремонта.", team: "Городской штаб", image: "CityRoad"),
        .init(id: "school", title: "Безопасный путь в школу", category: "Город", icon: "figure.walk", color: .blue, coordinate: .init(latitude: 51.139, longitude: 71.463), status: "Проверка маршрута", detail: "Осмотреть переход, знаки и тротуар на подходе к школе. Итог — короткое поручение ответственным службам.", team: "Транспорт", image: "CityRoad"),
        .init(id: "heat", title: "Подготовка к отоплению", category: "Поручения", icon: "thermometer.medium", color: .purple, coordinate: .init(latitude: 51.157, longitude: 71.448), status: "На контроле", detail: "Сверить готовность объектов к отопительному сезону и выделить участки, по которым требуется выездная проверка.", team: "Теплоснабжение", image: "CivicHall")
    ]
}

struct DemoMapView: View {
    private enum Presentation: Identifiable {
        case all
        case place(CityDemoPlace)
        var id: String {
            switch self {
            case .all: "all"
            case .place(let place): place.id
            }
        }
    }
    private static let city = MKCoordinateRegion(center: .init(latitude: 51.139, longitude: 71.438), span: .init(latitudeDelta: 0.065, longitudeDelta: 0.075))
    @State private var position: MapCameraPosition = .region(city)
    @State private var category = "Все"
    @State private var presentation: Presentation?
    private let categories = ["Все", "Город", "Обращения", "Поручения"]
    private var places: [CityDemoPlace] { CityDemoPlace.samples.filter { category == "Все" || $0.category == category } }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(categories, id: \.self) { item in
                        Button { category = item } label: {
                            Text(item).font(.subheadline.weight(.medium))
                                .padding(.horizontal, 14).padding(.vertical, 10)
                                .foregroundStyle(category == item ? Color.white : Color.primary)
                                .background(category == item ? Color(red: 12 / 255, green: 73 / 255, blue: 100 / 255) : Color(uiColor: .secondarySystemGroupedBackground), in: Capsule())
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("map.category.\(item)")
                    }
                }.padding(.horizontal, 16).padding(.vertical, 12)
            }
            Map(position: $position) {
                ForEach(places) { place in
                    Annotation(place.title, coordinate: place.coordinate) {
                        Button {
                            presentation = .place(place)
                        } label: {
                            Image(systemName: place.icon)
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 44, height: 44)
                                .background(place.color, in: Circle())
                                .overlay(Circle().stroke(.white, lineWidth: 3))
                                .shadow(color: .black.opacity(0.2), radius: 4, y: 2)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(place.title)
                        .accessibilityIdentifier("map.pin.\(place.id)")
                    }
                }
            }
            .mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
            .mapControls { MapCompass() }
            .overlay(alignment: .topTrailing) {
                Button { withAnimation { position = .region(Self.city) } } label: {
                    Image(systemName: "scope").font(.title3).frame(width: 46, height: 46)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
                }
                .accessibilityLabel("Показать весь город")
                .padding(16)
            }
            .safeAreaInset(edge: .bottom) {
                Button {
                    presentation = .all
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "mappin.and.ellipse").font(.title2)
                        VStack(alignment: .leading, spacing: 3) {
                            Text("\(places.count) объектов на карте").font(.headline)
                            Text("Астана · демонстрационные точки").font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.up").font(.caption.weight(.bold))
                    }
                    .foregroundStyle(.primary)
                    .padding(18)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("map.objects")
                .padding(14)
            }
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Карта города")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Text("Демо").font(.caption).foregroundStyle(.secondary) } }
        .sheet(item: $presentation) { item in
            NavigationStack {
                Group {
                    switch item {
                    case .place(let place):
                        CityDemoPlaceDetail(place: place)
                    case .all:
                        List(places) { place in
                            NavigationLink {
                                CityDemoPlaceDetail(place: place)
                            } label: {
                                Label {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(place.title).font(.headline)
                                        Text(place.status).font(.caption).foregroundStyle(.secondary)
                                    }.padding(.vertical, 5)
                                } icon: { Image(systemName: place.icon).foregroundStyle(place.color) }
                            }
                        }
                        .navigationTitle("Объекты города")
                    }
                }
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Готово") { presentation = nil } } }
            }
            .presentationDetents([.medium, .large])
        }
    }
}

private struct CityDemoPlaceDetail: View {
    let place: CityDemoPlace
    @State private var watched = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Image(place.image).resizable().scaledToFit()
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                Label(place.status, systemImage: place.icon).font(.subheadline.weight(.semibold)).foregroundStyle(place.color)
                Text(place.title).font(.title2.bold())
                Text(place.detail).font(.body)
                LabeledContent("Ответственный", value: place.team)
                LabeledContent("Контроль", value: "Сегодня, 17:00")
                Button { watched.toggle() } label: {
                    Label(watched ? "На вашем контроле" : "Взять на контроль", systemImage: watched ? "checkmark.circle.fill" : "bookmark")
                        .frame(maxWidth: .infinity)
                }.buttonStyle(.borderedProminent).controlSize(.large)
                Text("Демонстрационный объект. Координаты и статус условные.").font(.caption).foregroundStyle(.secondary)
            }.padding(20)
        }
        .navigationTitle("Карточка объекта")
        .navigationBarTitleDisplayMode(.inline)
    }
}
