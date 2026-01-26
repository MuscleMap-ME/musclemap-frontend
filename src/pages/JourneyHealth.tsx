import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { SafeMotion } from '@/utils/safeMotion';
import { useAuth } from '@/store/authStore';
import {
  JOURNEY_HEALTH_QUERY,
  JOURNEY_HEALTH_ALERTS_QUERY,
  JOURNEY_RECOMMENDATIONS_QUERY,
  JOURNEY_QUERY,
} from '@/graphql/queries';
import {
  JourneyHealthScore,
  JourneyHealthAlerts,
  JourneyRecommendations,
} from '@/components/journey-health';
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  AlertCircle,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';

export default function JourneyHealth() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'recommendations'>('overview');

  // Get current journey first
  const { data: journeyData } = useQuery(JOURNEY_QUERY, {
    skip: !token,
    fetchPolicy: 'cache-first',
  });

  const journeyId = journeyData?.journey?.id;

  // Fetch journey health data
  const {
    data: healthData,
    loading: healthLoading,
    refetch: refetchHealth,
  } = useQuery(JOURNEY_HEALTH_QUERY, {
    variables: { journeyId },
    skip: !token || !journeyId,
    fetchPolicy: 'cache-and-network',
  });

  // Fetch health alerts
  const {
    data: alertsData,
    loading: alertsLoading,
    refetch: refetchAlerts,
  } = useQuery(JOURNEY_HEALTH_ALERTS_QUERY, {
    variables: { journeyId, status: 'active', limit: 10 },
    skip: !token || !journeyId,
    fetchPolicy: 'cache-and-network',
  });

  // Fetch recommendations
  const {
    data: recommendationsData,
    loading: recommendationsLoading,
    refetch: refetchRecommendations,
  } = useQuery(JOURNEY_RECOMMENDATIONS_QUERY, {
    variables: { journeyId },
    skip: !token || !journeyId,
    fetchPolicy: 'cache-and-network',
  });

  const handleRefresh = () => {
    refetchHealth();
    refetchAlerts();
    refetchRecommendations();
  };

  const handleDismissAlert = (alertId: string) => {
    // TODO: Implement dismiss alert mutation
    console.log('Dismiss alert:', alertId);
  };

  const isLoading = healthLoading || alertsLoading || recommendationsLoading;
  const health = healthData?.journeyHealth;
  const alerts = alertsData?.journeyHealthAlerts || [];
  const recommendations = recommendationsData?.journeyRecommendations || [];

  // Tab content counts
  const alertCount = alerts.length;
  const recCount = recommendations.length;

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h2 className="text-xl font-bold mb-2">Login Required</h2>
          <p className="text-gray-400 mb-4">Please log in to view your journey health</p>
          <Link to="/login" className="text-purple-400 hover:text-purple-300">
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-lg p-4 sticky top-0 z-10 border-b border-gray-700">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/journey" className="text-blue-400 flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            Journey
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Journey Health
          </h1>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        {/* Loading State */}
        {isLoading && !health && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400 mb-3" />
              <p className="text-gray-400">Analyzing your journey...</p>
            </div>
          </div>
        )}

        {/* No Journey State */}
        {!isLoading && !journeyId && (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-bold mb-2">No Active Journey</h2>
            <p className="text-gray-400 mb-4">
              Start a workout to begin tracking your journey health
            </p>
            <Link
              to="/workout"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium transition-colors"
            >
              Start Workout
            </Link>
          </div>
        )}

        {/* Main Content */}
        {health && (
          <>
            {/* Health Score Card */}
            <SafeMotion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <JourneyHealthScore
                score={health.score}
                trend={health.trend}
                factors={health.factors || []}
                lastCalculated={health.lastCalculated}
              />
            </SafeMotion.div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'overview'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'alerts'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                Alerts
                {alertCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {alertCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'recommendations'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                Tips
                {recCount > 0 && (
                  <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {recCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <SafeMotion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">Active Alerts</span>
                      </div>
                      <div className="text-2xl font-bold">{alertCount}</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Lightbulb className="w-4 h-4" />
                        <span className="text-sm">Recommendations</span>
                      </div>
                      <div className="text-2xl font-bold">{recCount}</div>
                    </div>
                  </div>

                  {/* Recent Alerts Preview */}
                  {alertCount > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm text-gray-400 uppercase">Recent Alerts</h3>
                        <button
                          onClick={() => setActiveTab('alerts')}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          View All →
                        </button>
                      </div>
                      <JourneyHealthAlerts
                        alerts={alerts.slice(0, 2)}
                        onDismiss={handleDismissAlert}
                      />
                    </div>
                  )}

                  {/* Top Recommendations Preview */}
                  {recCount > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm text-gray-400 uppercase">Top Recommendations</h3>
                        <button
                          onClick={() => setActiveTab('recommendations')}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          View All →
                        </button>
                      </div>
                      <JourneyRecommendations recommendations={recommendations.slice(0, 2)} />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'alerts' && (
                <div>
                  <h3 className="text-sm text-gray-400 uppercase mb-4">Health Alerts</h3>
                  <JourneyHealthAlerts alerts={alerts} onDismiss={handleDismissAlert} />
                </div>
              )}

              {activeTab === 'recommendations' && (
                <div>
                  <h3 className="text-sm text-gray-400 uppercase mb-4">Personalized Recommendations</h3>
                  <JourneyRecommendations recommendations={recommendations} />
                </div>
              )}
            </SafeMotion.div>
          </>
        )}
      </div>
    </div>
  );
}
