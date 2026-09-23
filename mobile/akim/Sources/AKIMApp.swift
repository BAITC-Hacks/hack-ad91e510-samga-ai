import SwiftUI

@main
struct AKIMApp: App {
    var body: some Scene {
        WindowGroup {
            LoginView()
        }
    }
}

private enum Theme: String {
    case light
    case dark

    var colorScheme: ColorScheme {
        self == .light ? .light : .dark
    }

    var toggleLabel: String {
        self == .light ? "Включить тёмную тему" : "Включить светлую тему"
    }

    var iconName: String {
        self == .light ? "moon.fill" : "sun.max.fill"
    }
}

private enum AkimColor {
    static let deepBlue = Color(red: 12 / 255, green: 73 / 255, blue: 100 / 255)
    static let blue = Color(red: 8 / 255, green: 101 / 255, blue: 129 / 255)
    static let darkBlue = Color(red: 10 / 255, green: 53 / 255, blue: 78 / 255)
    static let gold = Color(red: 216 / 255, green: 181 / 255, blue: 86 / 255)
}

struct LoginView: View {
    @AppStorage("akim.theme") private var selectedTheme = Theme.light.rawValue
    @State private var email = ""
    @State private var password = ""
    @State private var showsPassword = false
    @State private var statusMessage: String?
    @State private var showsDashboard = ProcessInfo.processInfo.arguments.contains("--demo")
    @FocusState private var focusedField: Field?
    @ScaledMetric(relativeTo: .largeTitle) private var wordmarkSize = 36

    private enum Field { case email, password }
    private var theme: Theme { Theme(rawValue: selectedTheme) ?? .light }
    private var accent: Color {
        theme == .dark ? Color(red: 166 / 255, green: 211 / 255, blue: 237 / 255) : AkimColor.deepBlue
    }

    var body: some View {
        NavigationStack {
            GeometryReader { proxy in
                ScrollView {
                    VStack(spacing: 0) {
                        utilityBar
                        Spacer(minLength: 16)
                        identity
                        Spacer(minLength: 32)
                        credentials
                        Spacer(minLength: 28)
                        actions
                    }
                    .padding(.horizontal, 26)
                    .padding(.top, 8)
                    .padding(.bottom, 18)
                    .frame(maxWidth: 480)
                    .frame(minHeight: proxy.size.height)
                    .frame(maxWidth: .infinity)
                }
                .scrollIndicators(.hidden)
                .scrollBounceBehavior(.basedOnSize)
                .scrollDismissesKeyboard(.interactively)
            }
            .background(Color(uiColor: .systemGroupedBackground).ignoresSafeArea())
            .fullScreenCover(isPresented: $showsDashboard) {
                DemoRootView(onExit: { showsDashboard = false })
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .preferredColorScheme(theme.colorScheme)
        .tint(accent)
    }

    private var utilityBar: some View {
        HStack {
            Text("Республика Казахстан")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button {
                selectedTheme = theme == .light ? Theme.dark.rawValue : Theme.light.rawValue
            } label: {
                Image(systemName: theme.iconName)
                    .font(.system(size: 17, weight: .medium))
                    .frame(width: 44, height: 44)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(accent)
            .accessibilityLabel(theme.toggleLabel)
            .accessibilityIdentifier("login.theme")
        }
    }

    private var identity: some View {
        VStack(spacing: 12) {
            Image("KazakhstanEmblem")
                .resizable()
                .scaledToFit()
                .frame(width: 86, height: 86)
                .accessibilityLabel("Государственный герб Республики Казахстан")

            VStack(spacing: 6) {
                Text("АКИМ")
                    .font(.system(size: wordmarkSize, weight: .semibold))
                    .tracking(3)
                    .padding(.leading, 3)
                Text("Цифровой кабинет акима")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var credentials: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Вход в кабинет")
                .font(.title2.weight(.bold))
                .padding(.bottom, 2)

            VStack(alignment: .leading, spacing: 8) {
                Text("Электронная почта")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(.secondary)
                TextField("name@example.com", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .accessibilityLabel("Электронная почта")
                    .accessibilityIdentifier("login.email")
                    .focused($focusedField, equals: .email)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .password }
                    .padding(.horizontal, 16)
                    .frame(minHeight: 56)
                    .background(fieldBackground)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Пароль")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(.secondary)
                HStack(spacing: 8) {
                    Group {
                        if showsPassword {
                            TextField("Введите пароль", text: $password)
                        } else {
                            SecureField("Введите пароль", text: $password)
                        }
                    }
                    .textContentType(.password)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .accessibilityLabel("Пароль")
                    .accessibilityIdentifier("login.password")
                    .focused($focusedField, equals: .password)
                    .submitLabel(.go)
                    .onSubmit(signIn)

                    Button {
                        showsPassword.toggle()
                    } label: {
                        Image(systemName: showsPassword ? "eye.slash" : "eye")
                            .font(.system(size: 17))
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                    .accessibilityLabel(showsPassword ? "Скрыть пароль" : "Показать пароль")
                }
                .padding(.leading, 16)
                .padding(.trailing, 6)
                .frame(minHeight: 56)
                .background(fieldBackground)
            }

            if let statusMessage {
                Text(statusMessage)
                    .font(.footnote)
                    .foregroundStyle(statusMessage.hasPrefix("Авторизация") ? Color.secondary : Color.red)
                    .accessibilityIdentifier("login.status")
            }
        }
    }

    private var actions: some View {
        VStack(spacing: 12) {
            Button(action: signIn) {
                Text("Войти")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 5)
            }
            .buttonStyle(.borderedProminent)
            .buttonBorderShape(.roundedRectangle)
            .tint(AkimColor.deepBlue)
            .controlSize(.large)
            .accessibilityIdentifier("login.submit")

            Button {
                focusedField = nil
                showsDashboard = true
            } label: {
                Text("Открыть демоверсию")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(accent)
            .accessibilityIdentifier("login.demo")

            Text("Учебное демо · поручения сохраняются локально.\nСобытия → проблема → Помощник → проект поручения")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
        }
    }

    private var fieldBackground: some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .fill(Color(uiColor: .secondarySystemGroupedBackground))
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Color(uiColor: .separator).opacity(0.18))
            }
    }

    private func signIn() {
        focusedField = nil
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty, !password.isEmpty else {
            statusMessage = "Заполните электронную почту и пароль."
            return
        }
        guard trimmedEmail.range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#, options: .regularExpression) != nil else {
            statusMessage = "Проверьте формат электронной почты."
            return
        }
        statusMessage = "Авторизация пока не подключена. Откройте демоверсию."
        password = ""
        showsPassword = false
    }
}
