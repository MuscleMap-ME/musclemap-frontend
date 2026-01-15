/**
 * Workout Manager
 *
 * Manages workout state, exercise tracking, rest timer,
 * and synchronization with the phone app.
 */

import Foundation
import Combine
import WatchKit

/// Exercise model for watch app
struct WatchExercise: Identifiable, Codable {
    let id: String
    let name: String
    let muscleGroup: String
    let usesWeight: Bool
    let defaultSets: Int
    let defaultReps: Int
    let defaultRestSeconds: Int

    static let placeholder = WatchExercise(
        id: "placeholder",
        name: "Select Exercise",
        muscleGroup: "Unknown",
        usesWeight: true,
        defaultSets: 3,
        defaultReps: 10,
        defaultRestSeconds: 90
    )
}

/// Logged set data
struct LoggedSet: Identifiable, Codable {
    let id: String
    let exerciseId: String
    let setNumber: Int
    let reps: Int
    let weight: Double?
    let timestamp: Date
}

/// Workout manager for tracking active workout state
class WorkoutManager: NSObject, ObservableObject {
    static let shared = WorkoutManager()

    // MARK: - Published Properties

    @Published var isWorkoutActive: Bool = false
    @Published var workoutStartTime: Date?
    @Published var currentExercise: WatchExercise?
    @Published var currentSet: Int = 1
    @Published var targetSets: Int = 3
    @Published var loggedSets: [LoggedSet] = []

    // Rest Timer
    @Published var restTimeRemaining: Int = 90
    @Published var isRestTimerActive: Bool = false
    @Published var defaultRestTime: Int = 90

    // Heart Rate & Calories
    @Published var currentHeartRate: Double?
    @Published var caloriesBurned: Double = 0

    // Today's Stats
    @Published var todayTU: Int = 0
    @Published var todayWorkouts: Int = 0

    // Available exercises (synced from phone)
    @Published var availableExercises: [WatchExercise] = []

    // MARK: - Private Properties

    private var workoutId: String?
    private var restTimer: Timer?
    private var workoutTimer: Timer?
    private var workoutDuration: TimeInterval = 0
    private var cancellables = Set<AnyCancellable>()
    private let userDefaults = UserDefaults(suiteName: "group.com.musclemap.app")

    // MARK: - Computed Properties

    var formattedRestTime: String {
        let minutes = restTimeRemaining / 60
        let seconds = restTimeRemaining % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    var formattedDuration: String {
        let minutes = Int(workoutDuration) / 60
        let seconds = Int(workoutDuration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    // MARK: - Initialization

    private override init() {
        super.init()
        loadPersistedData()
        setupNotificationObservers()
    }

    // MARK: - Workout Lifecycle

    /// Start a quick workout without preset exercises
    func startQuickWorkout() {
        workoutId = UUID().uuidString
        workoutStartTime = Date()
        isWorkoutActive = true
        currentSet = 1
        loggedSets = []
        workoutDuration = 0

        // Start HealthKit workout session
        Task {
            do {
                try await HealthKitManager.shared.startWorkoutSession()
            } catch {
                print("[WorkoutManager] Failed to start HealthKit session: \(error)")
            }
        }

        // Start workout duration timer
        startWorkoutTimer()

        // Notify phone app
        WatchConnectivityManager.shared.sendMessage(
            type: .workoutStarted,
            payload: [
                "workoutId": workoutId!,
                "startTime": workoutStartTime!.timeIntervalSince1970
            ]
        )

        // Haptic feedback
        WKInterfaceDevice.current().play(.start)
    }

    /// Start a workout with a specific prescription
    func startWorkout(with exercises: [WatchExercise]) {
        availableExercises = exercises
        currentExercise = exercises.first
        targetSets = currentExercise?.defaultSets ?? 3
        defaultRestTime = currentExercise?.defaultRestSeconds ?? 90
        restTimeRemaining = defaultRestTime

        startQuickWorkout()
    }

    /// End the current workout and save data
    func endWorkout() {
        guard isWorkoutActive else { return }

        // Stop timers
        stopRestTimer()
        stopWorkoutTimer()

        // End HealthKit session
        Task {
            do {
                let workout = try await HealthKitManager.shared.endWorkoutSession()

                // Create workout data for sync
                let workoutData = WatchWorkoutData(
                    id: workoutId ?? UUID().uuidString,
                    startTime: workoutStartTime ?? Date(),
                    endTime: Date(),
                    exercises: loggedSets.map { set in
                        [
                            "exerciseId": set.exerciseId,
                            "setNumber": set.setNumber,
                            "reps": set.reps,
                            "weight": set.weight ?? 0
                        ]
                    },
                    totalSets: loggedSets.count,
                    totalReps: loggedSets.reduce(0) { $0 + $1.reps },
                    heartRateSamples: HealthKitManager.shared.getHeartRateSamples(),
                    caloriesBurned: workout?.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? 0
                )

                // Sync to phone
                WatchConnectivityManager.shared.syncWorkoutToPhone(workoutData)

            } catch {
                print("[WorkoutManager] Failed to end workout: \(error)")
            }
        }

        // Reset state
        isWorkoutActive = false
        workoutId = nil
        workoutStartTime = nil
        currentExercise = nil
        currentSet = 1
        loggedSets = []
        currentHeartRate = nil
        caloriesBurned = 0

        // Increment today's workout count
        todayWorkouts += 1
        persistTodayStats()

        // Haptic feedback
        WKInterfaceDevice.current().play(.stop)
    }

    // MARK: - Set Logging

    /// Log a completed set
    func logSet(reps: Int, weight: Double?) {
        let set = LoggedSet(
            id: UUID().uuidString,
            exerciseId: currentExercise?.id ?? "unknown",
            setNumber: currentSet,
            reps: reps,
            weight: weight,
            timestamp: Date()
        )

        loggedSets.append(set)

        // Notify phone app
        WatchConnectivityManager.shared.sendMessage(
            type: .setLogged,
            payload: [
                "workoutId": workoutId ?? "",
                "exerciseId": set.exerciseId,
                "setNumber": set.setNumber,
                "reps": set.reps,
                "weight": set.weight ?? 0
            ]
        )

        // Advance to next set or start rest timer
        if currentSet < targetSets {
            currentSet += 1
            startRestTimer()
        }

        // Haptic feedback
        WKInterfaceDevice.current().play(.success)
    }

    /// Change to a different exercise
    func selectExercise(_ exercise: WatchExercise) {
        currentExercise = exercise
        currentSet = 1
        targetSets = exercise.defaultSets
        defaultRestTime = exercise.defaultRestSeconds
        restTimeRemaining = defaultRestTime

        // Notify phone app
        WatchConnectivityManager.shared.sendMessage(
            type: .exerciseChanged,
            payload: [
                "workoutId": workoutId ?? "",
                "exerciseId": exercise.id,
                "exerciseName": exercise.name
            ]
        )
    }

    // MARK: - Rest Timer

    /// Start the rest timer
    func startRestTimer() {
        stopRestTimer()
        isRestTimerActive = true

        restTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }

            if self.restTimeRemaining > 0 {
                self.restTimeRemaining -= 1
            } else {
                self.restTimerCompleted()
            }
        }

        // Notify phone app
        WatchConnectivityManager.shared.sendMessage(
            type: .restTimerStarted,
            payload: [
                "workoutId": workoutId ?? "",
                "duration": restTimeRemaining
            ]
        )
    }

    /// Stop the rest timer
    func stopRestTimer() {
        restTimer?.invalidate()
        restTimer = nil
        isRestTimerActive = false

        // Notify phone app
        WatchConnectivityManager.shared.sendMessage(
            type: .restTimerStopped,
            payload: ["workoutId": workoutId ?? ""]
        )
    }

    /// Handle rest timer completion
    private func restTimerCompleted() {
        stopRestTimer()
        restTimeRemaining = defaultRestTime

        // Haptic notification
        WKInterfaceDevice.current().play(.notification)
    }

    /// Adjust rest timer by seconds (+ or -)
    func adjustRestTimer(by seconds: Int) {
        restTimeRemaining = max(0, restTimeRemaining + seconds)
    }

    /// Set rest timer to specific duration
    func setRestTimer(seconds: Int) {
        restTimeRemaining = seconds
        defaultRestTime = seconds
    }

    // MARK: - Workout Timer

    private func startWorkoutTimer() {
        workoutTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self, let startTime = self.workoutStartTime else { return }
            self.workoutDuration = Date().timeIntervalSince(startTime)

            // Update calories and heart rate from HealthKit
            self.caloriesBurned = HealthKitManager.shared.totalCalories
            self.currentHeartRate = HealthKitManager.shared.currentHeartRate
        }
    }

    private func stopWorkoutTimer() {
        workoutTimer?.invalidate()
        workoutTimer = nil
    }

    // MARK: - Persistence

    private func loadPersistedData() {
        // Load today's stats
        let today = Calendar.current.startOfDay(for: Date())
        let savedDate = userDefaults?.object(forKey: "statsDate") as? Date ?? Date.distantPast

        if Calendar.current.isDate(today, inSameDayAs: savedDate) {
            todayTU = userDefaults?.integer(forKey: "todayTU") ?? 0
            todayWorkouts = userDefaults?.integer(forKey: "todayWorkouts") ?? 0
        } else {
            // Reset for new day
            todayTU = 0
            todayWorkouts = 0
            persistTodayStats()
        }

        // Load default rest time preference
        let savedRestTime = userDefaults?.integer(forKey: "defaultRestTime") ?? 90
        if savedRestTime > 0 {
            defaultRestTime = savedRestTime
            restTimeRemaining = defaultRestTime
        }
    }

    private func persistTodayStats() {
        userDefaults?.set(Date(), forKey: "statsDate")
        userDefaults?.set(todayTU, forKey: "todayTU")
        userDefaults?.set(todayWorkouts, forKey: "todayWorkouts")
    }

    // MARK: - Notification Observers

    private func setupNotificationObservers() {
        NotificationCenter.default.publisher(for: .workoutPrescriptionReceived)
            .sink { [weak self] notification in
                guard let payload = notification.userInfo,
                      let exercisesData = payload["exercises"] as? [[String: Any]] else {
                    return
                }

                let exercises = exercisesData.compactMap { dict -> WatchExercise? in
                    guard let id = dict["id"] as? String,
                          let name = dict["name"] as? String else {
                        return nil
                    }

                    return WatchExercise(
                        id: id,
                        name: name,
                        muscleGroup: dict["muscleGroup"] as? String ?? "Unknown",
                        usesWeight: dict["usesWeight"] as? Bool ?? true,
                        defaultSets: dict["defaultSets"] as? Int ?? 3,
                        defaultReps: dict["defaultReps"] as? Int ?? 10,
                        defaultRestSeconds: dict["defaultRestSeconds"] as? Int ?? 90
                    )
                }

                DispatchQueue.main.async {
                    self?.availableExercises = exercises
                }
            }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: .userDataUpdated)
            .sink { [weak self] notification in
                guard let payload = notification.userInfo else { return }

                DispatchQueue.main.async {
                    if let tu = payload["todayTU"] as? Int {
                        self?.todayTU = tu
                    }
                    if let workouts = payload["todayWorkouts"] as? Int {
                        self?.todayWorkouts = workouts
                    }
                    self?.persistTodayStats()
                }
            }
            .store(in: &cancellables)
    }
}
