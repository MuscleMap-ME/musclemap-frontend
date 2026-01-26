import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { SafeMotion } from '@/utils/safeMotion';
import { Moon, Activity, Heart, Clock, Plus, RefreshCw } from 'lucide-react';
import {
  MuscleRecoveryStatus,
  SleepGoalSetter,
  RecoveryRecommendationCard,
  WeeklySleepChart,
} from '@/components/recovery';
import {
  MUSCLE_RECOVERY_STATUS_QUERY,
  SLEEP_TRACKING_QUERY,
  RECOVERY_RECOMMENDATIONS_QUERY,
} from '@/graphql/queries';
import { useAuthStore } from '@/store/authStore';

export default function RecoveryDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sleep' | 'muscles'>('overview');
  const [showSleepGoalModal, setShowSleepGoalModal] = useState(false);
  const token = useAuthStore((s) => s.token);

  const { data: recoveryData, loading: recoveryLoading, refetch: refetchRecovery } = useQuery(
    MUSCLE_RECOVERY_STATUS_QUERY,
    {
      skip: !token,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: sleepData, loading: sleepLoading, refetch: refetchSleep } = useQuery(
    SLEEP_TRACKING_QUERY,
    {
      variables: { days: 7 },
      skip: !token,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: recommendationsData, loading: recommendationsLoading } = useQuery(
    RECOVERY_RECOMMENDATIONS_QUERY,
    {
      skip: !token,
      fetchPolicy: 'cache-and-network',
    }
  );

  const isLoading = recoveryLoading || sleepLoading || recommendationsLoading;
  const recoveryStatus = recoveryData?.muscleRecoveryStatus;
  const sleepTracking = sleepData?.sleepTracking;
  const recommendations = recommendationsData?.recoveryRecommendations || [];

  const handleRefresh = () => {
    refetchRecovery();
    refetchSleep();
  };

  const handleSaveSleepGoal = (goal: { targetHours: number; bedtime: string; wakeTime: string }) => {
    // Would call mutation here
    console.log('Saving sleep goal:', goal);
    setShowSleepGoalModal(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Moon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Recovery Dashboard</h1>
          <p className="text-gray-400">Please log in to view your recovery data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-900/30 to-transparent">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Recovery</h1>
              <p className="text-gray-400 text-sm">Track your recovery and optimize rest</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <Moon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {sleepTracking?.averageHours?.toFixed(1) || '--'}h
              </p>
              <p className="text-xs text-gray-500">Avg Sleep</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <Activity className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {recoveryStatus?.overallScore || '--'}%
              </p>
              <p className="text-xs text-gray-500">Recovery</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <Heart className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {sleepTracking?.qualityScore || '--'}
              </p>
              <p className="text-xs text-gray-500">Quality</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex gap-2 mb-6">
          {(['overview', 'sleep', 'muscles'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-800/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Recovery Status */}
                {recoveryStatus && (
                  <SafeMotion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <MuscleRecoveryStatus
                      muscleGroups={recoveryStatus.muscleGroups || []}
                      overallScore={recoveryStatus.overallScore}
                    />
                  </SafeMotion.div>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <SafeMotion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h3 className="text-lg font-semibold text-white mb-3">Recommendations</h3>
                    <div className="space-y-3">
                      {recommendations.slice(0, 3).map((rec: any) => (
                        <RecoveryRecommendationCard
                          key={rec.id}
                          recommendation={rec}
                        />
                      ))}
                    </div>
                  </SafeMotion.div>
                )}
              </div>
            )}

            {/* Sleep Tab */}
            {activeTab === 'sleep' && (
              <div className="space-y-6">
                {/* Sleep Goal Button */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Sleep Tracking</h3>
                  <button
                    onClick={() => setShowSleepGoalModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Set Goal
                  </button>
                </div>

                {/* Weekly Chart */}
                {sleepTracking?.weeklyData && (
                  <SafeMotion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <WeeklySleepChart
                      data={sleepTracking.weeklyData}
                      targetHours={sleepTracking.targetHours || 8}
                    />
                  </SafeMotion.div>
                )}

                {/* Sleep Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-400">Consistency</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {sleepTracking?.consistency || 0}%
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-400">Avg Bedtime</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {sleepTracking?.averageBedtime || '--'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Muscles Tab */}
            {activeTab === 'muscles' && (
              <SafeMotion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {recoveryStatus ? (
                  <MuscleRecoveryStatus
                    muscleGroups={recoveryStatus.muscleGroups || []}
                    overallScore={recoveryStatus.overallScore}
                    showDetails
                  />
                ) : (
                  <div className="bg-gray-800 rounded-2xl p-6 text-center">
                    <Activity className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                    <h3 className="text-lg font-medium text-white mb-1">No Recovery Data</h3>
                    <p className="text-sm text-gray-400">
                      Complete workouts to start tracking muscle recovery
                    </p>
                  </div>
                )}
              </SafeMotion.div>
            )}
          </>
        )}
      </div>

      {/* Sleep Goal Modal */}
      <SleepGoalSetter
        isOpen={showSleepGoalModal}
        onClose={() => setShowSleepGoalModal(false)}
        onSave={handleSaveSleepGoal}
        currentGoal={sleepTracking?.targetHours ? {
          targetHours: sleepTracking.targetHours,
          bedtime: sleepTracking.targetBedtime || '22:00',
          wakeTime: sleepTracking.targetWakeTime || '06:00',
        } : undefined}
      />
    </div>
  );
}
