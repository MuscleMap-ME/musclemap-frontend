import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { SafeMotion } from '@/utils/safeMotion';
import { Target, Plus, TrendingUp, Trophy, Filter } from 'lucide-react';
import {
  ProgressionTargetCard,
  ProgressionTimeline,
  NewTargetModal,
} from '@/components/progression';
import {
  PROGRESSION_TARGETS_QUERY,
  PROGRESSION_MILESTONES_QUERY,
  EXERCISES_QUERY,
} from '@/graphql/queries';
import { useAuthStore } from '@/store/authStore';

type FilterStatus = 'all' | 'on_track' | 'at_risk' | 'achieved';

export default function ProgressionTargets() {
  const [activeTab, setActiveTab] = useState<'targets' | 'timeline'>('targets');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showNewTargetModal, setShowNewTargetModal] = useState(false);
  const token = useAuthStore((s) => s.token);

  const { data: targetsData, loading: targetsLoading, refetch: refetchTargets } = useQuery(
    PROGRESSION_TARGETS_QUERY,
    {
      skip: !token,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: milestonesData, loading: milestonesLoading } = useQuery(
    PROGRESSION_MILESTONES_QUERY,
    {
      variables: { limit: 20 },
      skip: !token,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: exercisesData } = useQuery(EXERCISES_QUERY, {
    variables: { limit: 100 },
    skip: !token,
  });

  const isLoading = targetsLoading || milestonesLoading;
  const targets = targetsData?.progressionTargets || [];
  const milestones = milestonesData?.progressionMilestones || [];
  const exercises = exercisesData?.exercises || [];

  const filteredTargets = targets.filter((t: any) => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  const stats = {
    total: targets.length,
    onTrack: targets.filter((t: any) => t.status === 'on_track').length,
    atRisk: targets.filter((t: any) => t.status === 'at_risk').length,
    achieved: targets.filter((t: any) => t.status === 'achieved').length,
  };

  const handleCreateTarget = (targetData: any) => {
    // Would call mutation here
    console.log('Creating target:', targetData);
    setShowNewTargetModal(false);
    refetchTargets();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Target className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Progression Targets</h1>
          <p className="text-gray-400">Please log in to view your progression targets</p>
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
              <h1 className="text-2xl font-bold text-white">Progression</h1>
              <p className="text-gray-400 text-sm">Track your strength goals and progress</p>
            </div>
            <button
              onClick={() => setShowNewTargetModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Target
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-blue-400">{stats.onTrack}</p>
              <p className="text-xs text-gray-500">On Track</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-amber-400">{stats.atRisk}</p>
              <p className="text-xs text-gray-500">At Risk</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-emerald-400">{stats.achieved}</p>
              <p className="text-xs text-gray-500">Achieved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('targets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'targets'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            Targets
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'timeline'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Timeline
          </button>
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
            {/* Targets Tab */}
            {activeTab === 'targets' && (
              <div className="space-y-4">
                {/* Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  {(['all', 'on_track', 'at_risk', 'achieved'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        filterStatus === status
                          ? 'bg-purple-600/30 text-purple-400'
                          : 'bg-gray-800/50 text-gray-400 hover:text-white'
                      }`}
                    >
                      {status === 'all' ? 'All' :
                       status === 'on_track' ? 'On Track' :
                       status === 'at_risk' ? 'At Risk' : 'Achieved'}
                    </button>
                  ))}
                </div>

                {/* Target Cards */}
                {filteredTargets.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {filteredTargets.map((target: any, index: number) => (
                      <SafeMotion.div
                        key={target.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ProgressionTargetCard
                          target={target}
                          onUpdate={(id) => console.log('Update target:', id)}
                        />
                      </SafeMotion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-2xl p-6 text-center">
                    <Target className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                    <h3 className="text-lg font-medium text-white mb-1">
                      {filterStatus === 'all' ? 'No Targets Yet' : 'No Matching Targets'}
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      {filterStatus === 'all'
                        ? 'Create your first progression target to start tracking'
                        : 'Try a different filter or create a new target'}
                    </p>
                    <button
                      onClick={() => setShowNewTargetModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Target
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <SafeMotion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ProgressionTimeline milestones={milestones} maxItems={15} />
              </SafeMotion.div>
            )}
          </>
        )}
      </div>

      {/* New Target Modal */}
      <NewTargetModal
        isOpen={showNewTargetModal}
        onClose={() => setShowNewTargetModal(false)}
        onSubmit={handleCreateTarget}
        exercises={exercises.map((e: any) => ({ id: e.id, name: e.name }))}
      />
    </div>
  );
}
