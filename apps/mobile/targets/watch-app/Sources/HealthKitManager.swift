/**
 * HealthKit Manager
 *
 * Manages HealthKit integration for the Apple Watch app.
 * Handles workout sessions, heart rate monitoring, and calorie tracking.
 */

import Foundation
import HealthKit
import WatchKit

class HealthKitManager: NSObject, ObservableObject {
    static let shared = HealthKitManager()

    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var workoutBuilder: HKLiveWorkoutBuilder?

    @Published var isAuthorized: Bool = false
    @Published var currentHeartRate: Double?
    @Published var activeCalories: Double = 0
    @Published var totalCalories: Double = 0

    // Heart rate samples collected during workout
    private var heartRateSamples: [Double] = []

    private override init() {
        super.init()
    }

    // MARK: - Authorization

    /// Request HealthKit authorization for required data types
    func requestAuthorization() async -> Bool {
        guard HKHealthStore.isHealthDataAvailable() else {
            print("[HealthKit] Health data not available on this device")
            return false
        }

        // Types to read
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .basalEnergyBurned)!,
            HKObjectType.workoutType()
        ]

        // Types to write
        let typesToWrite: Set<HKSampleType> = [
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.workoutType()
        ]

        do {
            try await healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead)
            DispatchQueue.main.async {
                self.isAuthorized = true
            }
            return true
        } catch {
            print("[HealthKit] Authorization error: \(error.localizedDescription)")
            return false
        }
    }

    // MARK: - Workout Session

    /// Start a new workout session
    func startWorkoutSession(activityType: HKWorkoutActivityType = .traditionalStrengthTraining) async throws {
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = activityType
        configuration.locationType = .indoor

        do {
            workoutSession = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            workoutBuilder = workoutSession?.associatedWorkoutBuilder()

            workoutSession?.delegate = self
            workoutBuilder?.delegate = self

            // Set data source for live workout data
            workoutBuilder?.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: configuration
            )

            // Start session and builder
            let startDate = Date()
            workoutSession?.startActivity(with: startDate)
            try await workoutBuilder?.beginCollection(at: startDate)

            print("[HealthKit] Workout session started")
        } catch {
            print("[HealthKit] Failed to start workout session: \(error)")
            throw error
        }
    }

    /// Pause the current workout session
    func pauseWorkout() {
        workoutSession?.pause()
    }

    /// Resume the current workout session
    func resumeWorkout() {
        workoutSession?.resume()
    }

    /// End the current workout session and save to HealthKit
    func endWorkoutSession() async throws -> HKWorkout? {
        guard let session = workoutSession, let builder = workoutBuilder else {
            print("[HealthKit] No active workout session to end")
            return nil
        }

        // End the session
        session.end()

        do {
            // End data collection
            try await builder.endCollection(at: Date())

            // Finish and save the workout
            let workout = try await builder.finishWorkout()

            // Reset state
            DispatchQueue.main.async {
                self.currentHeartRate = nil
                self.activeCalories = 0
                self.totalCalories = 0
            }

            // Clear heart rate samples
            let samples = heartRateSamples
            heartRateSamples = []

            print("[HealthKit] Workout saved: \(workout.duration) seconds, \(workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? 0) kcal")

            return workout
        } catch {
            print("[HealthKit] Failed to end workout: \(error)")
            throw error
        }
    }

    /// Get collected heart rate samples
    func getHeartRateSamples() -> [Double] {
        return heartRateSamples
    }

    // MARK: - Heart Rate Query

    /// Start streaming heart rate updates
    func startHeartRateQuery() {
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            return
        }

        let predicate = HKQuery.predicateForSamples(
            withStart: Date(),
            end: nil,
            options: .strictStartDate
        )

        let query = HKAnchoredObjectQuery(
            type: heartRateType,
            predicate: predicate,
            anchor: nil,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, _, _ in
            self?.processHeartRateSamples(samples as? [HKQuantitySample])
        }

        query.updateHandler = { [weak self] _, samples, _, _, _ in
            self?.processHeartRateSamples(samples as? [HKQuantitySample])
        }

        healthStore.execute(query)
    }

    private func processHeartRateSamples(_ samples: [HKQuantitySample]?) {
        guard let samples = samples, let latestSample = samples.last else {
            return
        }

        let heartRate = latestSample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))

        DispatchQueue.main.async {
            self.currentHeartRate = heartRate
            self.heartRateSamples.append(heartRate)
        }
    }
}

// MARK: - HKWorkoutSessionDelegate

extension HealthKitManager: HKWorkoutSessionDelegate {
    func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState,
        date: Date
    ) {
        print("[HealthKit] Workout state changed: \(fromState.rawValue) -> \(toState.rawValue)")

        switch toState {
        case .running:
            startHeartRateQuery()
        case .paused:
            break
        case .ended:
            break
        default:
            break
        }
    }

    func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didFailWithError error: Error
    ) {
        print("[HealthKit] Workout session error: \(error.localizedDescription)")
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension HealthKitManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {
        // Handle workout events if needed
    }

    func workoutBuilder(
        _ workoutBuilder: HKLiveWorkoutBuilder,
        didCollectDataOf collectedTypes: Set<HKSampleType>
    ) {
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }

            let statistics = workoutBuilder.statistics(for: quantityType)

            switch quantityType {
            case HKQuantityType.quantityType(forIdentifier: .heartRate):
                if let value = statistics?.mostRecentQuantity()?.doubleValue(for: HKUnit.count().unitDivided(by: .minute())) {
                    DispatchQueue.main.async {
                        self.currentHeartRate = value
                    }
                }

            case HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned):
                if let value = statistics?.sumQuantity()?.doubleValue(for: .kilocalorie()) {
                    DispatchQueue.main.async {
                        self.activeCalories = value
                        self.totalCalories = value
                    }
                }

            default:
                break
            }
        }
    }
}
