/**
 * MuscleMap Watch App
 *
 * Main entry point for the Apple Watch companion app.
 * Handles workout tracking, rest timer, and phone synchronization.
 */

import SwiftUI
import WatchConnectivity
import HealthKit

@main
struct MuscleMapWatchApp: App {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @StateObject private var healthKitManager = HealthKitManager.shared
    @StateObject private var workoutManager = WorkoutManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connectivityManager)
                .environmentObject(healthKitManager)
                .environmentObject(workoutManager)
        }
    }
}

// MARK: - Content View

struct ContentView: View {
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var connectivityManager: WatchConnectivityManager

    var body: some View {
        NavigationView {
            if workoutManager.isWorkoutActive {
                ActiveWorkoutView()
            } else {
                HomeView()
            }
        }
    }
}

// MARK: - Home View

struct HomeView: View {
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var connectivityManager: WatchConnectivityManager

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Quick Start Button
                Button(action: {
                    workoutManager.startQuickWorkout()
                }) {
                    VStack {
                        Image(systemName: "figure.strengthtraining.traditional")
                            .font(.largeTitle)
                            .foregroundColor(.blue)
                        Text("Start Workout")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(12)
                }
                .buttonStyle(PlainButtonStyle())

                // Today's Stats
                TodayStatsView()

                // Connection Status
                HStack {
                    Circle()
                        .fill(connectivityManager.isReachable ? Color.green : Color.red)
                        .frame(width: 8, height: 8)
                    Text(connectivityManager.isReachable ? "Connected" : "Disconnected")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
        }
        .navigationTitle("MuscleMap")
    }
}

// MARK: - Today's Stats View

struct TodayStatsView: View {
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        VStack(spacing: 8) {
            Text("Today")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(spacing: 16) {
                StatItem(
                    icon: "flame.fill",
                    value: "\(workoutManager.todayTU)",
                    label: "TU"
                )

                StatItem(
                    icon: "figure.walk",
                    value: "\(workoutManager.todayWorkouts)",
                    label: "Workouts"
                )
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

struct StatItem: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundColor(.blue)
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Active Workout View

struct ActiveWorkoutView: View {
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        TabView {
            // Current Exercise
            CurrentExerciseView()

            // Rest Timer
            RestTimerView()

            // Workout Controls
            WorkoutControlsView()
        }
        .tabViewStyle(PageTabViewStyle())
    }
}

// MARK: - Current Exercise View

struct CurrentExerciseView: View {
    @EnvironmentObject var workoutManager: WorkoutManager
    @State private var reps: Int = 10
    @State private var weight: Double = 0

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Exercise Name
                Text(workoutManager.currentExercise?.name ?? "Select Exercise")
                    .font(.headline)
                    .multilineTextAlignment(.center)

                // Set Counter
                HStack {
                    Text("Set \(workoutManager.currentSet)")
                        .font(.caption)
                    Text("/")
                        .foregroundColor(.secondary)
                    Text("\(workoutManager.targetSets)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Divider()

                // Reps Input (Digital Crown)
                VStack(spacing: 4) {
                    Text("Reps")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("\(reps)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                }
                .focusable()
                .digitalCrownRotation(
                    $reps,
                    from: 1,
                    through: 100,
                    by: 1,
                    sensitivity: .medium
                )

                // Weight Input
                if workoutManager.currentExercise?.usesWeight == true {
                    VStack(spacing: 4) {
                        Text("Weight")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text("\(Int(weight)) lbs")
                            .font(.caption)
                    }
                }

                // Log Set Button
                Button(action: {
                    workoutManager.logSet(reps: reps, weight: weight)
                }) {
                    Text("Log Set")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.blue)
            }
            .padding()
        }
    }
}

// MARK: - Rest Timer View

struct RestTimerView: View {
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        VStack(spacing: 16) {
            Text("Rest Timer")
                .font(.caption)
                .foregroundColor(.secondary)

            // Timer Display
            Text(workoutManager.formattedRestTime)
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundColor(workoutManager.isRestTimerActive ? .blue : .primary)

            // Timer Controls
            HStack(spacing: 20) {
                Button(action: {
                    workoutManager.adjustRestTimer(by: -15)
                }) {
                    Image(systemName: "minus.circle.fill")
                        .font(.title2)
                }
                .buttonStyle(PlainButtonStyle())

                Button(action: {
                    if workoutManager.isRestTimerActive {
                        workoutManager.stopRestTimer()
                    } else {
                        workoutManager.startRestTimer()
                    }
                }) {
                    Image(systemName: workoutManager.isRestTimerActive ? "pause.circle.fill" : "play.circle.fill")
                        .font(.largeTitle)
                        .foregroundColor(.blue)
                }
                .buttonStyle(PlainButtonStyle())

                Button(action: {
                    workoutManager.adjustRestTimer(by: 15)
                }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                }
                .buttonStyle(PlainButtonStyle())
            }

            // Quick Timer Presets
            HStack(spacing: 8) {
                ForEach([60, 90, 120], id: \.self) { seconds in
                    Button(action: {
                        workoutManager.setRestTimer(seconds: seconds)
                    }) {
                        Text("\(seconds)s")
                            .font(.caption2)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.gray.opacity(0.2))
                            .cornerRadius(8)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
        .padding()
    }
}

// MARK: - Workout Controls View

struct WorkoutControlsView: View {
    @EnvironmentObject var workoutManager: WorkoutManager
    @State private var showEndConfirmation = false

    var body: some View {
        VStack(spacing: 16) {
            // Workout Duration
            VStack(spacing: 4) {
                Text("Duration")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Text(workoutManager.formattedDuration)
                    .font(.title3)
                    .fontWeight(.semibold)
            }

            // Heart Rate (if available)
            if let heartRate = workoutManager.currentHeartRate {
                VStack(spacing: 4) {
                    Image(systemName: "heart.fill")
                        .foregroundColor(.red)
                    Text("\(Int(heartRate)) BPM")
                        .font(.caption)
                }
            }

            // Calories Burned
            VStack(spacing: 4) {
                Text("Calories")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Text("\(Int(workoutManager.caloriesBurned))")
                    .font(.headline)
            }

            Spacer()

            // End Workout Button
            Button(action: {
                showEndConfirmation = true
            }) {
                Text("End Workout")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
            .confirmationDialog(
                "End Workout?",
                isPresented: $showEndConfirmation,
                titleVisibility: .visible
            ) {
                Button("End & Save", role: .destructive) {
                    workoutManager.endWorkout()
                }
                Button("Cancel", role: .cancel) {}
            }
        }
        .padding()
    }
}

// MARK: - Preview Provider

#if DEBUG
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(WatchConnectivityManager.shared)
            .environmentObject(HealthKitManager.shared)
            .environmentObject(WorkoutManager.shared)
    }
}
#endif
