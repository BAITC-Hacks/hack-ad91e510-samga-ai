// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "CitizenCore", platforms: [.macOS(.v13)], products: [.library(name: "CitizenCore", targets: ["CitizenCore"])], targets: [.target(name: "CitizenCore", path: "Core"), .testTarget(name: "CitizenCoreTests", dependencies: ["CitizenCore"], path: "Tests")])
