import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/authStore';

const ARCHETYPES = ['bodybuilder', 'powerlifter', 'gymnast', 'crossfit', 'sprinter', 'judoka', 'boxer', 'wrestler', 'mma', 'rock_climber', 'marathon', 'cyclist'];

export default function Community() {
  const { token } = useAuth();
  const [tab, setTab] = useState('feed');
  const [feed, setFeed] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [archetypeFilter, setArchetypeFilter] = useState('');
  const [comparison, setComparison] = useState(null);
  const [city1, setCity1] = useState('');
  const [city2, setCity2] = useState('');
  const [percentile, setPercentile] = useState(null);
  const [guardrails, setGuardrails] = useState(null);
  const [titles, setTitles] = useState([]);
  const [myLocation, setMyLocation] = useState({ city: '', country: '' });

  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

  useEffect(() => {
    loadFeed();
    loadPercentile();
    loadGuardrails();
    loadTitles();
  }, []);

  useEffect(() => {
    if (tab === 'feed') loadFeed();
    else if (tab === 'leaderboard') loadLeaderboard();
  }, [tab, cityFilter, archetypeFilter]);

  const loadFeed = async () => {
    setLoading(true);
    let url = '/api/community/feed?limit=50';
    if (cityFilter) url += '&city=' + encodeURIComponent(cityFilter);
    if (archetypeFilter) url += '&archetype=' + archetypeFilter;
    const res = await fetch(url).then(r => r.json());
    setFeed(res.feed || []);
    setLoading(false);
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    let url = '/api/community/leaderboard/city?limit=50';
    if (cityFilter) url += '&city=' + encodeURIComponent(cityFilter);
    if (archetypeFilter) url += '&archetype=' + archetypeFilter;
    const res = await fetch(url).then(r => r.json());
    setLeaderboard(res.leaderboard || []);
    setLoading(false);
  };

  const loadComparison = async () => {
    if (!city1 || !city2) return alert('Enter both cities');
    const url = '/api/community/compare/cities?city1=' + encodeURIComponent(city1) + '&city2=' + encodeURIComponent(city2) + (archetypeFilter ? '&archetype=' + archetypeFilter : '');
    const res = await fetch(url).then(r => r.json());
    setComparison(res);
  };

  const loadPercentile = async () => {
    const res = await fetch('/api/community/percentile', { headers }).then(r => r.json());
    setPercentile(res);
  };

  const loadGuardrails = async () => {
    const res = await fetch('/api/community/guardrails', { headers }).then(r => r.json());
    setGuardrails(res);
  };

  const loadTitles = async () => {
    const res = await fetch('/api/community/titles').then(r => r.json());
    setTitles(res.titles || []);
  };

  const updateLocation = async () => {
    await fetch('/api/community/location', { method: 'POST', headers, body: JSON.stringify(myLocation) });
    alert('Location updated!');
  };

  const followUser = async (id) => {
    await fetch('/api/community/follow/' + id, { method: 'POST', headers });
    loadLeaderboard();
  };

  const getArchetypeIcon = (a) => {
    const icons = { bodybuilder: '💪', powerlifter: '🏋️', gymnast: '🤸', crossfit: '⚡', sprinter: '🏃', judoka: '🥋', boxer: '🥊', wrestler: '🤼', mma: '👊', rock_climber: '🧗', marathon: '🏃‍♂️', cyclist: '🚴' };
    return icons[a] || '🎯';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <header className="bg-gray-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-blue-400">← Back</Link>
          <h1 className="text-xl font-bold">🌍 Community</h1>
          <div></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {/* Quick Navigation */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Link to="/competitions" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium">🏆 Competitions</Link>
          <Link to="/highfives" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium">🖐️ High Fives</Link>
          <Link to="/locations" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium">📍 Locations</Link>
        </div>
        {/* Percentile & Guardrails */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {percentile && (
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-4">
              <div className="text-4xl font-bold">{percentile.percentile}%</div>
              <div className="text-sm opacity-80">Top {100 - percentile.percentile}% of {percentile.totalUsers} users</div>
            </div>
          )}
          {guardrails?.warning && (
            <div className={'rounded-2xl p-4 ' + (guardrails.warning.level === 'danger' ? 'bg-red-600' : 'bg-yellow-600')}>
              <div className="font-bold">{guardrails.warning.level === 'danger' ? '⚠️ Warning' : '⚡ Caution'}</div>
              <div className="text-sm">{guardrails.warning.message}</div>
            </div>
          )}
          {!guardrails?.warning && (
            <div className="bg-green-600 rounded-2xl p-4">
              <div className="font-bold">✅ On Track</div>
              <div className="text-sm">Training load is balanced</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {['feed', 'leaderboard', 'compare', 'titles', 'settings'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={'px-4 py-2 rounded-full capitalize whitespace-nowrap ' + (tab === t ? 'bg-purple-600' : 'bg-gray-700')}>{t}</button>
          ))}
        </div>

        {/* Filters */}
        {(tab === 'feed' || tab === 'leaderboard') && (
          <div className="flex gap-2 mb-4">
            <input placeholder="Filter by city..." value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="flex-1 bg-gray-800 p-2 rounded-xl" />
            <select value={archetypeFilter} onChange={e => setArchetypeFilter(e.target.value)} className="bg-gray-800 p-2 rounded-xl">
              <option value="">All Types</option>
              {ARCHETYPES.map(a => <option key={a} value={a}>{getArchetypeIcon(a)} {a}</option>)}
            </select>
          </div>
        )}

        {/* Feed Tab */}
        {tab === 'feed' && (
          <div className="space-y-3">
            {loading ? <div className="text-center py-8">Loading...</div> : feed.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No activity yet. Be the first!</div>
            ) : feed.map(f => (
              <div key={f.id} className="bg-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold">{f.username?.[0]?.toUpperCase() || '?'}</div>
                  <div>
                    <div className="font-bold">{f.username || 'Anonymous'}</div>
                    <div className="text-xs text-gray-400">{f.city} • {new Date(f.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-sm">
                  {f.activity_type === 'workout' && '🏋️ Completed a workout'}
                  {f.activity_type === 'achievement' && '🏆 Earned an achievement'}
                  {f.activity_type === 'milestone' && '🎯 Reached a milestone'}
                  {f.activity_type === 'title' && '👑 Earned a new title'}
                </div>
                {f.content && <div className="mt-2 text-gray-300">{f.content}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard Tab */}
        {tab === 'leaderboard' && (
          <div className="space-y-2">
            {loading ? <div className="text-center py-8">Loading...</div> : leaderboard.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No users found</div>
            ) : leaderboard.map((u, i) => (
              <div key={u.id} className="bg-gray-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={'w-8 h-8 rounded-full flex items-center justify-center font-bold ' + (i < 3 ? 'bg-yellow-500' : 'bg-gray-600')}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      {u.username}
                      {u.current_archetype && <span className="text-sm">{getArchetypeIcon(u.current_archetype)}</span>}
                    </div>
                    <div className="text-xs text-gray-400">{u.city || 'Unknown'} • Level {u.level || 1}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-purple-400">{Math.round(u.total_tu || 0)} TU</div>
                  <button onClick={() => followUser(u.id)} className="text-xs text-blue-400">Follow</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Compare Tab */}
        {tab === 'compare' && (
          <div>
            <div className="bg-gray-800 rounded-2xl p-4 mb-4">
              <h3 className="font-bold mb-3">🏙️ City vs City</h3>
              <div className="flex gap-2 mb-3">
                <input placeholder="City 1 (e.g., New York)" value={city1} onChange={e => setCity1(e.target.value)} className="flex-1 bg-gray-700 p-2 rounded-xl" />
                <span className="self-center">vs</span>
                <input placeholder="City 2 (e.g., Los Angeles)" value={city2} onChange={e => setCity2(e.target.value)} className="flex-1 bg-gray-700 p-2 rounded-xl" />
              </div>
              <button onClick={loadComparison} className="w-full bg-purple-600 py-2 rounded-xl font-bold">Compare</button>
            </div>

            {comparison && (
              <div className="bg-gray-800 rounded-2xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="font-bold text-lg">{comparison.city1.name}</div>
                    <div className="text-3xl font-bold text-purple-400">{Math.round(comparison.city1.total_tu || 0)}</div>
                    <div className="text-sm text-gray-400">{comparison.city1.users} users</div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-4xl">{comparison.winner === comparison.city1.name ? '🏆' : comparison.winner === comparison.city2.name ? '' : '🤝'}</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg">{comparison.city2.name}</div>
                    <div className="text-3xl font-bold text-blue-400">{Math.round(comparison.city2.total_tu || 0)}</div>
                    <div className="text-sm text-gray-400">{comparison.city2.users} users</div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <span className="bg-green-600 px-4 py-1 rounded-full font-bold">Winner: {comparison.winner}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Titles Tab */}
        {tab === 'titles' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-400 mb-2">Earn titles by dominating specific exercises or categories</div>
            {titles.map(t => (
              <div key={t.id} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold">{t.name}</div>
                  <div className="text-sm text-gray-400">
                    {t.exercise ? `${t.min}+ reps of ${t.exercise}` : `${t.min}+ reps in ${t.category}`}
                  </div>
                </div>
                <div className="text-3xl">👑</div>
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="bg-gray-800 rounded-2xl p-4">
            <h3 className="font-bold mb-4">📍 Set Your Location</h3>
            <input placeholder="City" value={myLocation.city} onChange={e => setMyLocation({ ...myLocation, city: e.target.value })} className="w-full bg-gray-700 p-3 rounded-xl mb-3" />
            <input placeholder="Country" value={myLocation.country} onChange={e => setMyLocation({ ...myLocation, country: e.target.value })} className="w-full bg-gray-700 p-3 rounded-xl mb-3" />
            <button onClick={updateLocation} className="w-full bg-purple-600 py-3 rounded-xl font-bold">Save Location</button>
            <p className="text-xs text-gray-400 mt-3">Your location helps you compete with others in your city and find nearby workout spots.</p>
          </div>
        )}
      </main>
    </div>
  );
}
