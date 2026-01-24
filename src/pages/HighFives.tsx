import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '../store/authStore';
import {
  HIGH_FIVE_STATS_QUERY,
  HIGH_FIVE_USERS_QUERY,
  HIGH_FIVES_RECEIVED_QUERY,
  HIGH_FIVES_SENT_QUERY,
} from '../graphql/queries';
import { SEND_HIGH_FIVE_MUTATION } from '../graphql/mutations';

// TypeScript interfaces
interface HighFiveStats {
  sent: number;
  received: number;
  unread: number;
}

interface HighFiveUser {
  id: string;
  username: string;
  level: number;
  currentArchetype: string | null;
  avatarUrl: string | null;
}

interface HighFiveEncouragement {
  id: string;
  type: string;
  message: string | null;
  senderName: string | null;
  senderId: string | null;
  recipientName: string | null;
  recipientId: string | null;
  readAt: string | null;
  createdAt: string;
}

const TYPES = [
  { id: 'high_five', icon: '🖐️', name: 'High Five' },
  { id: 'fist_bump', icon: '👊', name: 'Fist Bump' },
  { id: 'clap', icon: '👏', name: 'Applause' },
  { id: 'fire', icon: '🔥', name: 'On Fire' },
  { id: 'rocket', icon: '🚀', name: 'Rocket' },
];

export default function HighFives() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState('send');
  const [selected, setSelected] = useState<HighFiveUser | null>(null);
  const [type, setType] = useState('high_five');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // GraphQL queries
  const { data: statsData, refetch: refetchStats } = useQuery<{ highFiveStats: HighFiveStats }>(
    HIGH_FIVE_STATS_QUERY,
    {
      skip: !isAuthenticated,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: usersData, loading: usersLoading } = useQuery<{ highFiveUsers: HighFiveUser[] }>(
    HIGH_FIVE_USERS_QUERY,
    {
      skip: !isAuthenticated,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: receivedData, loading: receivedLoading, refetch: refetchReceived } = useQuery<{
    highFivesReceived: HighFiveEncouragement[];
  }>(HIGH_FIVES_RECEIVED_QUERY, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const { data: sentData, loading: sentLoading, refetch: refetchSent } = useQuery<{
    highFivesSent: HighFiveEncouragement[];
  }>(HIGH_FIVES_SENT_QUERY, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  // GraphQL mutation
  const [sendHighFive] = useMutation(SEND_HIGH_FIVE_MUTATION, {
    onCompleted: () => {
      refetchStats();
      refetchReceived();
      refetchSent();
    },
  });

  // Extract data with memoization
  const stats = useMemo(
    () => statsData?.highFiveStats || { sent: 0, received: 0, unread: 0 },
    [statsData]
  );
  const users = useMemo(() => usersData?.highFiveUsers || [], [usersData]);
  const received = useMemo(() => receivedData?.highFivesReceived || [], [receivedData]);
  const sent = useMemo(() => sentData?.highFivesSent || [], [sentData]);

  const loading = usersLoading || receivedLoading || sentLoading;

  const send = useCallback(async () => {
    if (!selected) {
      alert('Select someone to encourage!');
      return;
    }
    setSending(true);
    try {
      const result = await sendHighFive({
        variables: {
          input: {
            recipientId: selected.id,
            type,
            message: message || null,
          },
        },
      });

      if (result.data?.sendHighFive?.error) {
        alert(result.data.sendHighFive.error);
      } else {
        setSelected(null);
        setMessage('');
      }
    } catch {
      alert('Failed to send');
    }
    setSending(false);
  }, [selected, type, message, sendHighFive]);

  const getIcon = useCallback(
    (t: string) => TYPES.find((x) => x.id === t)?.icon || '🖐️',
    []
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <header className="bg-gray-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/community" className="text-blue-400">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">🖐️ High Fives</h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-green-600/20 border border-green-600 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{stats.sent}</div>
            <div className="text-xs text-gray-400">Sent</div>
          </div>
          <div className="bg-purple-600/20 border border-purple-600 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{stats.received}</div>
            <div className="text-xs text-gray-400">Received</div>
          </div>
          <div className="bg-yellow-600/20 border border-yellow-600 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{stats.unread}</div>
            <div className="text-xs text-gray-400">Unread</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {['send', 'received', 'sent'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'flex-1 py-2 rounded-full capitalize ' +
                (tab === t ? 'bg-purple-600' : 'bg-gray-700')
              }
            >
              {t}{' '}
              {t === 'received' && stats.unread > 0 && (
                <span className="bg-red-500 text-xs px-1.5 py-0.5 rounded-full ml-1">
                  {stats.unread}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 animate-pulse">Loading...</div>
        ) : tab === 'send' ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-400 mb-2">Select someone to encourage:</div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {users.length === 0 ? (
                <div className="text-center text-gray-500 py-4">No other users yet</div>
              ) : (
                users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelected(u)}
                    className={
                      'w-full bg-gray-800 p-3 rounded-xl flex items-center gap-3 transition-all ' +
                      (selected?.id === u.id
                        ? 'ring-2 ring-purple-500 bg-gray-700'
                        : 'hover:bg-gray-750')
                    }
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-lg">
                      {u.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-bold">{u.username}</div>
                      <div className="text-xs text-gray-400">
                        Level {u.level || 1} • {u.currentArchetype || 'Explorer'}
                      </div>
                    </div>
                    {selected?.id === u.id && <span className="text-green-400 text-xl">✓</span>}
                  </button>
                ))
              )}
            </div>

            {selected && (
              <>
                <div className="text-sm text-gray-400 mt-4">Choose encouragement:</div>
                <div className="grid grid-cols-5 gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={
                        'p-3 rounded-xl text-center transition-all ' +
                        (type === t.id
                          ? 'bg-purple-600 scale-110'
                          : 'bg-gray-800 hover:bg-gray-700')
                      }
                    >
                      <div className="text-2xl">{t.icon}</div>
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Add a message (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-gray-800 p-3 rounded-xl h-20 resize-none"
                />

                <button
                  onClick={send}
                  disabled={sending}
                  className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {sending ? 'Sending...' : `Send ${getIcon(type)} to ${selected.username}`}
                </button>
              </>
            )}
          </div>
        ) : tab === 'received' ? (
          <div className="space-y-3">
            {received.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No encouragements yet. Keep training! 💪
              </div>
            ) : (
              received.map((e) => (
                <div
                  key={e.id}
                  className={
                    'bg-gray-800 p-4 rounded-xl transition-all ' +
                    (!e.readAt ? 'border-l-4 border-purple-500' : '')
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getIcon(e.type)}</span>
                    <div className="flex-1">
                      <div className="font-bold">
                        {e.senderName} sent you a {e.type.replace('_', ' ')}!
                      </div>
                      {e.message && (
                        <div className="text-sm text-gray-400 mt-1">&quot;{e.message}&quot;</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(e.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sent.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                You haven&apos;t sent any encouragements yet. Spread the love!
              </div>
            ) : (
              sent.map((e) => (
                <div key={e.id} className="bg-gray-800 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getIcon(e.type)}</span>
                    <div className="flex-1">
                      <div className="font-bold">
                        You sent a {e.type.replace('_', ' ')} to {e.recipientName}
                      </div>
                      {e.message && (
                        <div className="text-sm text-gray-400 mt-1">&quot;{e.message}&quot;</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(e.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
