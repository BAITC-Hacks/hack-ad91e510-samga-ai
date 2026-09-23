import SwiftUI
import AVFoundation
import PhotosUI

enum InputMode { case photo, voice, text }

@MainActor @Observable
final class VoiceCapture {
    var recording = false
    var elapsed = 0
    var error: String?
    private var recorder: AVAudioRecorder?
    private var player: AVAudioPlayer?
    private var timer: Timer?
    private var url: URL?
    private var startGeneration = UUID()

    func start() async {
        let generation = UUID(); startGeneration = generation
        let allowed = await AVAudioApplication.requestRecordPermission()
        guard generation == startGeneration else { return }
        guard allowed else { error = "Разрешите микрофон в настройках iPhone. Можно также добавить фото или текст."; return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            try session.setActive(true)
            let location = FileManager.default.temporaryDirectory.appendingPathComponent("citizen-\(UUID().uuidString).m4a")
            let capture = try AVAudioRecorder(url: location, settings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 22050, AVNumberOfChannelsKey: 1, AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue])
            guard capture.record() else { throw NSError(domain: "Audio", code: 1, userInfo: [NSLocalizedDescriptionKey: "Не удалось начать запись."]) }
            recorder = capture; url = location; elapsed = 0; recording = true
            timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in Task { @MainActor in self?.elapsed += 1 } }
        } catch { self.error = error.localizedDescription }
    }

    func cancelPendingStart() { startGeneration = UUID() }

    func stop() -> Data? {
        recorder?.stop(); recording = false; timer?.invalidate(); timer = nil
        guard let url else { return nil }
        do {
            let data = try Data(contentsOf: url)
            do { try FileManager.default.removeItem(at: url); self.url = nil }
            catch { self.error = "Запись приложена, но временная копия не удалена: \(error.localizedDescription)" }
            do { try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }
            catch { self.error = "Запись приложена. Не удалось освободить аудиосессию: \(error.localizedDescription)" }
            return data
        } catch { self.error = error.localizedDescription; return nil }
    }

    func play(_ data: Data) {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback)
            try AVAudioSession.sharedInstance().setActive(true)
            player = try AVAudioPlayer(data: data)
            player?.play()
        } catch { self.error = "Не удалось воспроизвести запись: \(error.localizedDescription)" }
    }
}

struct CameraCapture: UIViewControllerRepresentable {
    let completion: (UIImage?) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(completion: completion) }
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController(); picker.sourceType = .camera; picker.delegate = context.coordinator; return picker
    }
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let completion: (UIImage?) -> Void
        init(completion: @escaping (UIImage?) -> Void) { self.completion = completion }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) { completion(info[.originalImage] as? UIImage) }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { completion(nil) }
    }
}

@MainActor
func resizedPhoto(_ image: UIImage) -> Data? {
    let scale = min(1, 1400 / max(image.size.width, image.size.height))
    let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
    let format = UIGraphicsImageRendererFormat(); format.scale = 1
    return UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }.jpegData(compressionQuality: 0.8)
}
