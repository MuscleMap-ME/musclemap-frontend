import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '../store/authStore';
import {
  SKILL_TREES_QUERY,
  SKILL_TREE_QUERY,
  SKILL_TREE_PROGRESS_QUERY,
  SKILL_SUMMARY_QUERY,
  LOG_SKILL_PRACTICE_MUTATION,
  ACHIEVE_SKILL_MUTATION,
} from '../graphql';

// Difficulty stars display
const DifficultyStars = ({ difficulty }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={star <= difficulty ? 'text-yellow-400' : 'text-gray-600'}
      >
        ★
      </span>
    ))}
  </div>
);

// Status badge with color
const StatusBadge = ({ status }) => {
  const colors = {
    locked: 'bg-gray-700 text-gray-400',
    available: 'bg-blue-600 text-white',
    in_progress: 'bg-yellow-600 text-white',
    achieved: 'bg-green-600 text-white',
  };
  const labels = {
    locked: '🔒 Locked',
    available: '✨ Available',
    in_progress: '🔥 In Progress',
    achieved: '🏆 Achieved',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.locked}`}>
      {labels[status] || status}
    </span>
  );
};

// Skill card component
const SkillCard = ({ node, onClick }) => {
  const status = node.progress?.status || 'locked';
  const isLocked = status === 'locked';

  return (
    <button
      onClick={() => !isLocked && onClick(node)}
      disabled={isLocked}
      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
        isLocked
          ? 'bg-gray-800/50 border-gray-700 opacity-60 cursor-not-allowed'
          : status === 'achieved'
          ? 'bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-600 hover:border-green-500'
          : status === 'in_progress'
          ? 'bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border-yellow-600 hover:border-yellow-500'
          : 'bg-gray-800 border-gray-600 hover:border-blue-500 hover:bg-gray-700'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-white">{node.name}</h3>
        <StatusBadge status={status} />
      </div>
      <p className="text-sm text-gray-400 mb-3">{node.description}</p>
      <div className="flex items-center justify-between">
        <DifficultyStars difficulty={node.difficulty} />
        <span className="text-xs text-gray-500">
          {node.criteriaType === 'hold' && `Hold ${node.criteriaValue}s`}
          {node.criteriaType === 'reps' && `${node.criteriaValue} reps`}
          {node.criteriaType === 'time' && `${node.criteriaValue}s time`}
          {node.criteriaType === 'form_check' && 'Form check'}
        </span>
      </div>
      {node.progress?.bestValue != null && (
        <div className="mt-2 text-sm text-blue-400">
          Best: {node.progress.bestValue}
          {node.criteriaType === 'hold' || node.criteriaType === 'time' ? 's' : ' reps'}
        </div>
      )}
    </button>
  );
};

// Skill detail modal
const SkillDetailModal = ({ skill, onClose, onLogPractice, onAchieve }) => {
  const [practiceMinutes, setPracticeMinutes] = useState(10);
  const [valueAchieved, setValueAchieved] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogPractice = async () => {
    setSubmitting(true);
    await onLogPractice({
      skillNodeId: skill.id,
      durationMinutes: practiceMinutes,
      valueAchieved: valueAchieved ? parseInt(valueAchieved) : undefined,
      notes: notes || undefined,
    });
    setSubmitting(false);
    onClose();
  };

  const handleAchieve = async () => {
    setSubmitting(true);
    await onAchieve({ skillNodeId: skill.id });
    setSubmitting(false);
    onClose();
  };

  const status = skill.progress?.status || 'available';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{skill.name}</h2>
              <StatusBadge status={status} />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
              ×
            </button>
          </div>

          <p className="text-gray-300 mb-4">{skill.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Difficulty</div>
              <DifficultyStars difficulty={skill.difficulty} />
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Goal</div>
              <div className="text-white font-medium">{skill.criteriaDescription}</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">XP Reward</div>
              <div className="text-green-400 font-medium">+{skill.xpReward} XP</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Credit Reward</div>
              <div className="text-yellow-400 font-medium">+{skill.creditReward} 💰</div>
            </div>
          </div>

          {skill.tips?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-2">Tips</h3>
              <ul className="space-y-2">
                {skill.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300">
                    <span className="text-green-400">✓</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status !== 'achieved' && (
            <>
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-lg font-bold text-white mb-4">Log Practice</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={practiceMinutes}
                      onChange={(e) => setPracticeMinutes(parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Value achieved ({skill.criteriaType === 'hold' || skill.criteriaType === 'time' ? 'seconds' : 'reps'})
                    </label>
                    <input
                      type="number"
                      value={valueAchieved}
                      onChange={(e) => setValueAchieved(e.target.value)}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white resize-none"
                      rows={2}
                      placeholder="How did it go?"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleLogPractice}
                      disabled={submitting || practiceMinutes < 1}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Log Practice'}
                    </button>
                    {valueAchieved && parseInt(valueAchieved) >= (skill.criteriaValue || 0) && (
                      <button
                        onClick={handleAchieve}
                        disabled={submitting}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                      >
                        🏆 Mark Achieved!
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {status === 'achieved' && (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">🏆</div>
              <div className="text-green-400 font-bold text-lg">Skill Mastered!</div>
              {skill.progress?.achievedAt && (
                <div className="text-gray-400 text-sm mt-2">
                  Achieved on {new Date(skill.progress.achievedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main skill tree view
const SkillTreeView = ({ tree, progress, onLogPractice, onAchieve }) => {
  const [selectedSkill, setSelectedSkill] = useState(null);

  // Group skills by tier
  const tiers = {};
  progress.forEach((node) => {
    if (!tiers[node.tier]) tiers[node.tier] = [];
    tiers[node.tier].push(node);
  });

  const tierNames = {
    1: 'Foundation',
    2: 'Intermediate',
    3: 'Advanced',
    4: 'Expert',
    5: 'Master',
  };

  return (
    <div>
      <div
        className={`rounded-xl p-4 mb-6 bg-gradient-to-r ${tree.color || 'from-purple-500 to-pink-500'}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-4xl">{tree.icon}</span>
          <div>
            <h2 className="text-2xl font-bold text-white">{tree.name}</h2>
            <p className="text-white/80">{tree.description}</p>
          </div>
        </div>
      </div>

      {Object.keys(tiers)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((tier) => (
          <div key={tier} className="mb-8">
            <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
              <span className="bg-gray-700 px-3 py-1 rounded-full text-sm">Tier {tier}</span>
              {tierNames[tier]}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiers[tier]
                .sort((a, b) => a.position - b.position)
                .map((node) => (
                  <SkillCard key={node.id} node={node} onClick={setSelectedSkill} />
                ))}
            </div>
          </div>
        ))}

      {selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
          onLogPractice={onLogPractice}
          onAchieve={onAchieve}
        />
      )}
    </div>
  );
};

// Summary card
const ProgressSummaryCard = ({ summary }) => {
  if (!summary) return null;

  const percent =
    summary.totalSkills > 0
      ? Math.round((summary.achievedSkills / summary.totalSkills) * 100)
      : 0;

  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-6 mb-6">
      <h2 className="text-xl font-bold text-white mb-4">Your Progress</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400">{summary.achievedSkills}</div>
          <div className="text-gray-400 text-sm">Mastered</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-400">{summary.inProgressSkills}</div>
          <div className="text-gray-400 text-sm">In Progress</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400">{summary.availableSkills}</div>
          <div className="text-gray-400 text-sm">Available</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-400">
            {Math.floor((summary.totalPracticeMinutes ?? 0) / 60)}h
          </div>
          <div className="text-gray-400 text-sm">Practice Time</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Overall Progress</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// TypeScript interfaces
interface SkillTree {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  nodeCount: number;
  nodes?: SkillNodeData[];
}

interface SkillNodeData {
  id: string;
  treeId: string;
  name: string;
  description?: string;
  tier: number;
  position: number;
  difficulty: number;
  criteriaType?: string;
  criteriaValue?: number;
  criteriaDescription?: string;
  xpReward: number;
  creditReward: number;
  tips?: string[];
  progress?: {
    status: string;
    practiceMinutes: number;
    practiceCount: number;
    bestValue?: number;
    achievedAt?: string;
  };
}

interface SkillSummary {
  totalSkills: number;
  achievedSkills: number;
  inProgressSkills: number;
  availableSkills: number;
  lockedSkills: number;
  totalPracticeMinutes: number;
}

// Main component
export default function Skills() {
  const { treeId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [error, setError] = useState<string | null>(null);

  // GraphQL queries
  const { data: treesData, loading: treesLoading } = useQuery<{ skillTrees: SkillTree[] }>(SKILL_TREES_QUERY);

  const { data: summaryData, refetch: refetchSummary } = useQuery<{ skillSummary: SkillSummary }>(SKILL_SUMMARY_QUERY, {
    skip: !token,
    fetchPolicy: 'cache-and-network',
  });

  const { data: treeData, loading: treeLoading } = useQuery<{ skillTree: SkillTree }>(SKILL_TREE_QUERY, {
    variables: { treeId },
    skip: !treeId,
    fetchPolicy: 'cache-and-network',
  });

  const { data: progressData, loading: progressLoading, refetch: refetchProgress } = useQuery<{ skillTreeProgress: SkillNodeData[] }>(
    SKILL_TREE_PROGRESS_QUERY,
    {
      variables: { treeId },
      skip: !treeId || !token,
      fetchPolicy: 'cache-and-network',
    }
  );

  // GraphQL mutations
  const [logPractice] = useMutation(LOG_SKILL_PRACTICE_MUTATION, {
    onCompleted: () => {
      refetchProgress();
      refetchSummary();
    },
    onError: () => {
      setError('Failed to log practice');
    },
  });

  const [achieveSkillMutation] = useMutation(ACHIEVE_SKILL_MUTATION, {
    onCompleted: (result) => {
      if (result?.achieveSkill?.success) {
        alert(`🏆 Skill achieved! +${result.achieveSkill.creditsAwarded} credits, +${result.achieveSkill.xpAwarded} XP`);
        refetchProgress();
        refetchSummary();
      } else {
        alert(result?.achieveSkill?.error || 'Failed to achieve skill');
      }
    },
    onError: () => {
      setError('Failed to achieve skill');
    },
  });

  const trees = treesData?.skillTrees || [];
  const selectedTree = treeData?.skillTree || null;
  const treeProgress = progressData?.skillTreeProgress || [];
  const summary = summaryData?.skillSummary || null;
  const loading = treesLoading || treeLoading || progressLoading;

  // Log practice handler
  const handleLogPractice = async (data: { skillNodeId: string; durationMinutes: number; valueAchieved?: number; notes?: string }) => {
    if (!token) {
      alert('Please log in to track your progress');
      return;
    }
    await logPractice({
      variables: {
        input: {
          skillNodeId: data.skillNodeId,
          durationMinutes: data.durationMinutes,
          valueAchieved: data.valueAchieved,
          notes: data.notes,
        },
      },
    });
  };

  // Achieve skill handler
  const handleAchieve = async (data: { skillNodeId: string }) => {
    if (!token) {
      alert('Please log in to track your progress');
      return;
    }
    await achieveSkillMutation({
      variables: { skillNodeId: data.skillNodeId },
    });
  };

  if (loading && !trees.length) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🏋️</div>
          <div>Loading skills...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <header className="bg-gray-800 p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to={treeId ? '/skills' : '/dashboard'} className="text-blue-400">
            ← {treeId ? 'All Trees' : 'Back'}
          </Link>
          <h1 className="text-xl font-bold">
            {selectedTree ? selectedTree.name : 'Skill Trees'}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-4">
            {error}
          </div>
        )}

        {!treeId ? (
          <>
            {/* Summary */}
            {token && <ProgressSummaryCard summary={summary} />}

            {/* Tree grid */}
            <h2 className="text-2xl font-bold text-white mb-4">Skill Trees</h2>
            <p className="text-gray-400 mb-6">
              Master bodyweight skills from beginner to elite. Track your progress, log practice
              sessions, and earn rewards as you unlock new abilities.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trees.map((tree) => (
                <button
                  key={tree.id}
                  onClick={() => navigate(`/skills/${tree.id}`)}
                  className={`p-6 rounded-xl text-left transition-all hover:scale-[1.02] bg-gradient-to-br ${
                    tree.color || 'from-purple-500 to-pink-500'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{tree.icon}</span>
                    <h3 className="text-xl font-bold text-white">{tree.name}</h3>
                  </div>
                  <p className="text-white/80 text-sm">{tree.description}</p>
                </button>
              ))}
            </div>

            {/* Info section */}
            <div className="mt-12 bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">How It Works</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl mb-2">📚</div>
                  <h4 className="font-bold text-white mb-1">Choose a Path</h4>
                  <p className="text-gray-400 text-sm">
                    Select a skill tree to focus on. Each tree has progressive skills from
                    foundation to master level.
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-2">🎯</div>
                  <h4 className="font-bold text-white mb-1">Practice & Progress</h4>
                  <p className="text-gray-400 text-sm">
                    Log your practice sessions and track your best attempts. Unlock new skills by
                    completing prerequisites.
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-2">🏆</div>
                  <h4 className="font-bold text-white mb-1">Earn Rewards</h4>
                  <p className="text-gray-400 text-sm">
                    Get XP and credits for mastering skills. Compete on leaderboards and show off
                    your achievements.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Summary */}
            {token && <ProgressSummaryCard summary={summary} />}

            {/* Tree view */}
            {selectedTree && (
              <SkillTreeView
                tree={selectedTree}
                progress={treeProgress}
                onLogPractice={handleLogPractice}
                onAchieve={handleAchieve}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
