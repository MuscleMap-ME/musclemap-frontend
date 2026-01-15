/**
 * Watch Connectivity Manager
 *
 * Manages bidirectional communication between the Apple Watch app
 * and the iPhone companion app using WatchConnectivity framework.
 */

import Foundation
import WatchConnectivity

/// Message types for watch-phone communication
enum WatchMessageType: String, Codable {
    case workoutStarted = "workout_started"
    case workoutEnded = "workout_ended"
    case setLogged = "set_logged"
    case restTimerStarted = "rest_timer_started"
    case restTimerStopped = "rest_timer_stopped"
    case exerciseChanged = "exercise_changed"
    case syncRequest = "sync_request"
    case syncResponse = "sync_response"
    case userDataUpdate = "user_data_update"
    case workoutPrescription = "workout_prescription"
}

/// Watch message payload
struct WatchMessage: Codable {
    let type: WatchMessageType
    let payload: [String: AnyCodable]
    let timestamp: Date

    init(type: WatchMessageType, payload: [String: Any] = [:]) {
        self.type = type
        self.payload = payload.mapValues { AnyCodable($0) }
        self.timestamp = Date()
    }
}

/// Type-erased Codable wrapper for Any values
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}

/// Manages WatchConnectivity session and message passing
class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()

    @Published var isReachable: Bool = false
    @Published var isPaired: Bool = false
    @Published var isWatchAppInstalled: Bool = false
    @Published var pendingMessages: [WatchMessage] = []
    @Published var lastReceivedData: [String: Any] = [:]

    private var session: WCSession?
    private let userDefaultsSuite = UserDefaults(suiteName: "group.com.musclemap.app")

    private override init() {
        super.init()
        setupSession()
    }

    // MARK: - Session Setup

    private func setupSession() {
        guard WCSession.isSupported() else {
            print("[WatchConnectivity] WCSession not supported on this device")
            return
        }

        session = WCSession.default
        session?.delegate = self
        session?.activate()
    }

    // MARK: - Send Messages

    /// Send a message to the paired device with optional reply handler
    func sendMessage(
        type: WatchMessageType,
        payload: [String: Any] = [:],
        replyHandler: (([String: Any]) -> Void)? = nil,
        errorHandler: ((Error) -> Void)? = nil
    ) {
        guard let session = session, session.activationState == .activated else {
            print("[WatchConnectivity] Session not activated")
            errorHandler?(WatchConnectivityError.sessionNotActivated)
            return
        }

        let message: [String: Any] = [
            "type": type.rawValue,
            "payload": payload,
            "timestamp": Date().timeIntervalSince1970
        ]

        if session.isReachable {
            session.sendMessage(message, replyHandler: replyHandler) { error in
                print("[WatchConnectivity] Send message error: \(error.localizedDescription)")
                errorHandler?(error)
            }
        } else {
            // Queue message for later delivery via application context
            do {
                try session.updateApplicationContext(message)
                print("[WatchConnectivity] Message queued via application context")
            } catch {
                print("[WatchConnectivity] Failed to update application context: \(error)")
                errorHandler?(error)
            }
        }
    }

    /// Transfer user info for guaranteed delivery
    func transferUserInfo(_ userInfo: [String: Any]) {
        guard let session = session, session.activationState == .activated else {
            print("[WatchConnectivity] Session not activated for user info transfer")
            return
        }

        session.transferUserInfo(userInfo)
    }

    // MARK: - Workout Sync

    /// Sync workout data to phone
    func syncWorkoutToPhone(_ workout: WatchWorkoutData) {
        sendMessage(
            type: .workoutEnded,
            payload: workout.toDictionary()
        ) { reply in
            print("[WatchConnectivity] Workout synced successfully: \(reply)")
        } errorHandler: { error in
            print("[WatchConnectivity] Failed to sync workout: \(error)")
            // Store locally for later sync
            self.storeForLaterSync(workout)
        }
    }

    /// Request current workout prescription from phone
    func requestWorkoutPrescription(completion: @escaping ([String: Any]?) -> Void) {
        sendMessage(
            type: .workoutPrescription,
            payload: [:]
        ) { reply in
            completion(reply)
        } errorHandler: { _ in
            completion(nil)
        }
    }

    // MARK: - Local Storage

    private func storeForLaterSync(_ workout: WatchWorkoutData) {
        var pendingWorkouts = userDefaultsSuite?.array(forKey: "pendingWorkouts") as? [[String: Any]] ?? []
        pendingWorkouts.append(workout.toDictionary())
        userDefaultsSuite?.set(pendingWorkouts, forKey: "pendingWorkouts")
    }

    /// Sync any pending workouts that failed to send
    func syncPendingWorkouts() {
        guard let pendingWorkouts = userDefaultsSuite?.array(forKey: "pendingWorkouts") as? [[String: Any]],
              !pendingWorkouts.isEmpty else {
            return
        }

        for workout in pendingWorkouts {
            sendMessage(
                type: .workoutEnded,
                payload: workout
            ) { [weak self] _ in
                // Remove from pending on success
                self?.removePendingWorkout(workout)
            }
        }
    }

    private func removePendingWorkout(_ workout: [String: Any]) {
        var pendingWorkouts = userDefaultsSuite?.array(forKey: "pendingWorkouts") as? [[String: Any]] ?? []
        pendingWorkouts.removeAll { dict in
            (dict["id"] as? String) == (workout["id"] as? String)
        }
        userDefaultsSuite?.set(pendingWorkouts, forKey: "pendingWorkouts")
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable

            #if os(iOS)
            self.isPaired = session.isPaired
            self.isWatchAppInstalled = session.isWatchAppInstalled
            #endif
        }

        if let error = error {
            print("[WatchConnectivity] Activation error: \(error.localizedDescription)")
        } else {
            print("[WatchConnectivity] Session activated: \(activationState.rawValue)")
            // Sync any pending workouts
            syncPendingWorkouts()
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
            print("[WatchConnectivity] Reachability changed: \(session.isReachable)")
        }

        if session.isReachable {
            syncPendingWorkouts()
        }
    }

    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        handleReceivedMessage(message)
        replyHandler(["status": "received"])
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        handleReceivedMessage(message)
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        handleReceivedMessage(applicationContext)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        handleReceivedMessage(userInfo)
    }

    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {
        print("[WatchConnectivity] Session became inactive")
    }

    func sessionDidDeactivate(_ session: WCSession) {
        print("[WatchConnectivity] Session deactivated")
        // Reactivate session
        WCSession.default.activate()
    }
    #endif

    // MARK: - Message Handling

    private func handleReceivedMessage(_ message: [String: Any]) {
        guard let typeString = message["type"] as? String,
              let type = WatchMessageType(rawValue: typeString) else {
            print("[WatchConnectivity] Invalid message format")
            return
        }

        let payload = message["payload"] as? [String: Any] ?? [:]

        DispatchQueue.main.async {
            self.lastReceivedData = payload

            switch type {
            case .workoutPrescription:
                NotificationCenter.default.post(
                    name: .workoutPrescriptionReceived,
                    object: nil,
                    userInfo: payload
                )

            case .userDataUpdate:
                NotificationCenter.default.post(
                    name: .userDataUpdated,
                    object: nil,
                    userInfo: payload
                )

            case .syncResponse:
                NotificationCenter.default.post(
                    name: .syncResponseReceived,
                    object: nil,
                    userInfo: payload
                )

            default:
                print("[WatchConnectivity] Received message type: \(type)")
            }
        }
    }
}

// MARK: - Errors

enum WatchConnectivityError: LocalizedError {
    case sessionNotActivated
    case deviceNotReachable
    case encodingError

    var errorDescription: String? {
        switch self {
        case .sessionNotActivated:
            return "Watch session not activated"
        case .deviceNotReachable:
            return "Paired device not reachable"
        case .encodingError:
            return "Failed to encode message"
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let workoutPrescriptionReceived = Notification.Name("workoutPrescriptionReceived")
    static let userDataUpdated = Notification.Name("userDataUpdated")
    static let syncResponseReceived = Notification.Name("syncResponseReceived")
}

// MARK: - Watch Workout Data

struct WatchWorkoutData {
    let id: String
    let startTime: Date
    let endTime: Date
    let exercises: [[String: Any]]
    let totalSets: Int
    let totalReps: Int
    let heartRateSamples: [Double]
    let caloriesBurned: Double

    func toDictionary() -> [String: Any] {
        return [
            "id": id,
            "startTime": startTime.timeIntervalSince1970,
            "endTime": endTime.timeIntervalSince1970,
            "exercises": exercises,
            "totalSets": totalSets,
            "totalReps": totalReps,
            "heartRateSamples": heartRateSamples,
            "caloriesBurned": caloriesBurned
        ]
    }
}
