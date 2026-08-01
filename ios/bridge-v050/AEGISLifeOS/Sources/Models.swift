import Foundation

struct NativeAccessSnapshot: Codable, Equatable {
    let calendar: String
    let reminders: String
    let behavior: String
    let dataLocation: String
    let version: String
}

struct AgendaItem: Codable, Identifiable, Equatable {
    enum Kind: String, Codable {
        case event
        case reminder
    }

    let id: String
    let kind: Kind
    let title: String
    let start: Date?
    let end: Date?
    let isAllDay: Bool
    let source: String
}

struct NativeBridgeMessage: Decodable {
    let command: String
    let payload: [String: String]?
}

struct NativeBridgeResponse: Encodable {
    let command: String
    let ok: Bool
    let payload: EncodablePayload?
    let error: String?
}

struct EncodablePayload: Encodable {
    private let encodeBlock: (Encoder) throws -> Void

    init<T: Encodable>(_ value: T) {
        encodeBlock = { encoder in try value.encode(to: encoder) }
    }

    func encode(to encoder: Encoder) throws {
        try encodeBlock(encoder)
    }
}
