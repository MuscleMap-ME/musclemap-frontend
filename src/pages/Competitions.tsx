import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  COMPETITIONS_QUERY,
  MY_COMPETITION_ENTRIES_QUERY,
  JOIN_COMPETITION_MUTATION,
  CREATE_COMPETITION_MUTATION,
} from '../graphql';

// Types for GraphQL responses
interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  score: number;
  rank?: number;
  tuEarned: number;
}

interface Competition {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  participantCount: number;
  maxParticipants?: number;
  goalTu?: number;
  hasJoined?: boolean;
  leaderboard?: LeaderboardEntry[];
}

interface CompetitionEntry {
  id: string;
  competitionId: string;
}

export default function Competitions() {
  const [tab, setTab] = useState('active');
  const [showCreate, setShowCreate] = useState(false);
  const [newComp, setNewComp] = useState({
    name: '',
    description: '',
    type: 'weekly',
    goalTu: 100,
  });

  // GraphQL queries
  const {
    data: competitionsData,
    loading: competitionsLoading,
    refetch: refetchCompetitions,
  } = useQuery(COMPETITIONS_QUERY, {
    variables: { status: tab },
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: entriesData,
    refetch: refetchEntries,
  } = useQuery(MY_COMPETITION_ENTRIES_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  // GraphQL mutations
  const [joinCompetition] = useMutation(JOIN_COMPETITION_MUTATION, {
    onCompleted: () => {
      refetchCompetitions();
      refetchEntries();
    },
  });

  const [createCompetition] = useMutation(CREATE_COMPETITION_MUTATION, {
    onCompleted: () => {
      setShowCreate(false);
      setNewComp({ name: '', description: '', type: 'weekly', goalTu: 100 });
      refetchCompetitions();
      refetchEntries();
    },
  });

  const competitions: Competition[] = competitionsData?.competitions || [];
  const myEntries: CompetitionEntry[] = entriesData?.myCompetitionEntries || [];
  const loading = competitionsLoading;

  const handleJoin = async (id: string) => {
    await joinCompetition({ variables: { competitionId: id } });
  };

  const handleCreate = async () => {
    if (!newComp.name) {
      alert('Name required');
      return;
    }
    await createCompetition({
      variables: {
        input: {
          name: newComp.name,
          description: newComp.description || undefined,
          type: newComp.type,
          goalTu: newComp.goalTu,
        },
      },
    });
  };

  const icon = (t: string) =>
    ({ weekly: '📅', monthly: '🗓️', challenge: '⚔️', championship: '🏆' }[t] || '🎯');

  const joined = (id: string) => myEntries.some((e) => e.competitionId === id);

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <header className="bg-gray-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/community" className="text-blue-400">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">🏆 Competitions</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-green-600 px-3 py-1 rounded text-sm"
          >
            + New
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4">
        <div className="flex gap-2 mb-6">
          {['active', 'upcoming', 'completed'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'flex-1 py-2 rounded-full capitalize text-sm ' +
                (tab === t ? 'bg-purple-600' : 'bg-gray-700')
              }
            >
              {t}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="text-center py-8 animate-pulse">Loading...</div>
        ) : competitions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No {tab} competitions. Create one!
          </div>
        ) : (
          <div className="space-y-4">
            {competitions.map((c) => (
              <div key={c.id} className="bg-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{icon(c.type)}</span>
                  <div className="flex-1">
                    <div className="font-bold">{c.name}</div>
                    <div className="text-sm text-gray-400">{c.description}</div>
                  </div>
                  <span
                    className={
                      'px-2 py-1 rounded text-xs ' +
                      (c.status === 'active' ? 'bg-green-600' : 'bg-gray-600')
                    }
                  >
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-center text-sm">
                  <div className="bg-gray-700 p-2 rounded">
                    <div className="font-bold">{c.participantCount || 0}</div>
                    <div className="text-xs text-gray-400">Players</div>
                  </div>
                  <div className="bg-gray-700 p-2 rounded">
                    <div className="font-bold">{c.goalTu || 100} TU</div>
                    <div className="text-xs text-gray-400">Goal</div>
                  </div>
                  <div className="bg-gray-700 p-2 rounded">
                    <div className="font-bold capitalize">{c.type}</div>
                    <div className="text-xs text-gray-400">Type</div>
                  </div>
                </div>
                {c.leaderboard && c.leaderboard.length > 0 && (
                  <div className="border-t border-gray-700 pt-3 mb-3">
                    {c.leaderboard.slice(0, 3).map((e, i) => (
                      <div key={e.userId} className="flex justify-between text-sm py-1">
                        <span>
                          {['🥇', '🥈', '🥉'][i]} {e.username}
                        </span>
                        <span className="text-yellow-400">{Math.round(e.tuEarned)} TU</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleJoin(c.id)}
                  disabled={joined(c.id) || c.hasJoined}
                  className={
                    'w-full py-2 rounded-xl font-bold transition-all ' +
                    (joined(c.id) || c.hasJoined
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700')
                  }
                >
                  {joined(c.id) || c.hasJoined ? '✓ Joined' : '⚔️ Join Competition'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Competition</h2>
            <input
              placeholder="Competition Name"
              value={newComp.name}
              onChange={(e) => setNewComp({ ...newComp, name: e.target.value })}
              className="w-full bg-gray-700 p-3 rounded-xl mb-3"
            />
            <textarea
              placeholder="Description"
              value={newComp.description}
              onChange={(e) => setNewComp({ ...newComp, description: e.target.value })}
              className="w-full bg-gray-700 p-3 rounded-xl mb-3 h-20"
            />
            <select
              value={newComp.type}
              onChange={(e) => setNewComp({ ...newComp, type: e.target.value })}
              className="w-full bg-gray-700 p-3 rounded-xl mb-3"
            >
              <option value="weekly">📅 Weekly</option>
              <option value="monthly">🗓️ Monthly</option>
              <option value="challenge">⚔️ Challenge</option>
              <option value="championship">🏆 Championship</option>
            </select>
            <input
              type="number"
              placeholder="Goal TU"
              value={newComp.goalTu}
              onChange={(e) => setNewComp({ ...newComp, goalTu: Number(e.target.value) })}
              className="w-full bg-gray-700 p-3 rounded-xl mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-gray-600 py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 bg-green-600 py-3 rounded-xl font-bold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
