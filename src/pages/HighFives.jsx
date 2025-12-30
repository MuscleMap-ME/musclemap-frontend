import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

const TYPES = [
  { id: 'high_five', icon: '🖐️', name: 'High Five' },
  { id: 'fist_bump', icon: '👊', name: 'Fist Bump' },
  { id: 'clap', icon: '👏', name: 'Applause' },
  { id: 'fire', icon: '🔥', name: 'On Fire' },
  { id: 'rocket', icon: '🚀', name: 'Rocket' },
];

export default function HighFives() {
  const [tab, setTab] = useState('send');
  const [users, setUsers] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [stats, setStats] = useState({ sent: 0, received: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [type, setType] = useState('high_five');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [u, r, s, st] = await Promise.all([
        api.highFives.users(),
        api.highFives.received(),
        api.highFives.sent(),
        api.highFives.stats(),
      ]);
      setUsers(u.users || []);
      setReceived(r.encouragements || []);
      setSent(s.encouragements || []);
      setStats(st);
    } catch(err) {}
    setLoading(false);
  };
  
  const send = async () => {
    if (!selected) return alert('Select someone to encourage!');
    setSending(true);
    try {
      const res = await api.highFives.send({ recipient_id: selected.id, type, message });
      if (res.error) {
        alert(res.error);
      } else {
        setSelected(null);
        setMessage('');
        load();
      }
    } catch(err) {
      alert('Failed to send');
    }
    setSending(false);
  };
  
  const getIcon = (t) => TYPES.find(x => x.id === t)?.icon || '🖐️';

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <header className="bg-gray-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/community" className="text-blue-400">← Back</Link>
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
          {['send', 'received', 'sent'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={'flex-1 py-2 rounded-full capitalize ' + (tab === t ? 'bg-purple-600' : 'bg-gray-700')}>
              {t} {t === 'received' && stats.unread > 0 && <span className="bg-red-500 text-xs px-1.5 py-0.5 rounded-full ml-1">{stats.unread}</span>}
            </button>
          ))}
        </div>

        {loading ? <div className="text-center py-8 animate-pulse">Loading...</div> : tab === 'send' ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-400 mb-2">Select someone to encourage:</div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {users.length === 0 ? (
                <div className="text-center text-gray-500 py-4">No other users yet</div>
              ) : users.map(u => (
                <button 
                  key={u.id} 
                  onClick={() => setSelected(u)} 
                  className={'w-full bg-gray-800 p-3 rounded-xl flex items-center gap-3 transition-all ' + (selected?.id === u.id ? 'ring-2 ring-purple-500 bg-gray-700' : 'hover:bg-gray-750')}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-lg">
                    {u.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold">{u.username}</div>
                    <div className="text-xs text-gray-400">Level {u.level || 1} • {u.current_archetype || 'Explorer'}</div>
                  </div>
                  {selected?.id === u.id && <span className="text-green-400 text-xl">✓</span>}
                </button>
              ))}
            </div>
            
            {selected && (
              <>
                <div className="text-sm text-gray-400 mt-4">Choose encouragement:</div>
                <div className="grid grid-cols-5 gap-2">
                  {TYPES.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setType(t.id)} 
                      className={'p-3 rounded-xl text-center transition-all ' + (type === t.id ? 'bg-purple-600 scale-110' : 'bg-gray-800 hover:bg-gray-700')}
                    >
                      <div className="text-2xl">{t.icon}</div>
                    </button>
                  ))}
                </div>
                
                <textarea 
                  placeholder="Add a message (optional)" 
                  value={message} 
                  onChange={e => setMessage(e.target.value)} 
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
              <div className="text-center text-gray-400 py-8">No encouragements yet. Keep training! 💪</div>
            ) : received.map(e => (
              <div key={e.id} className={'bg-gray-800 p-4 rounded-xl transition-all ' + (!e.read_at ? 'border-l-4 border-purple-500' : '')}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getIcon(e.type)}</span>
                  <div className="flex-1">
                    <div className="font-bold">{e.sender_name} sent you a {e.type.replace('_', ' ')}!</div>
                    {e.message && <div className="text-sm text-gray-400 mt-1">"{e.message}"</div>}
                    <div className="text-xs text-gray-500 mt-1">{new Date(e.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sent.length === 0 ? (
              <div className="text-center text-gray-400 py-8">You haven't sent any encouragements yet. Spread the love! ❤️</div>
            ) : sent.map(e => (
              <div key={e.id} className="bg-gray-800 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getIcon(e.type)}</span>
                  <div className="flex-1">
                    <div className="font-bold">You sent a {e.type.replace('_', ' ')} to {e.recipient_name}</div>
                    {e.message && <div className="text-sm text-gray-400 mt-1">"{e.message}"</div>}
                    <div className="text-xs text-gray-500 mt-1">{new Date(e.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
