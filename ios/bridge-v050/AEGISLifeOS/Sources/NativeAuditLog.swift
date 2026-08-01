import Foundation

actor NativeAuditLog {
    static let shared = NativeAuditLog()

    private struct Entry: Codable {
        let timestamp: Date
        let action: String
        let outcome: String
        let detail: String
    }

    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    func append(action: String, outcome: String, detail: String) {
        let entry = Entry(
            timestamp: Date(),
            action: action,
            outcome: outcome,
            detail: String(detail.prefix(240))
        )

        do {
            let directory = try auditDirectory()
            let file = directory.appendingPathComponent("native-audit.jsonl")
            let line = try encoder.encode(entry) + Data([0x0A])

            if FileManager.default.fileExists(atPath: file.path) {
                let handle = try FileHandle(forWritingTo: file)
                defer { try? handle.close() }
                try handle.seekToEnd()
                try handle.write(contentsOf: line)
            } else {
                try line.write(to: file, options: .atomic)
            }
        } catch {
            // Audit failure never grants access or changes calendar data.
        }
    }

    private func auditDirectory() throws -> URL {
        let root = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let directory = root.appendingPathComponent("AEGISLifeOS", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }
}
