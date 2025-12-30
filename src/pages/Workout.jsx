import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const BODY_PARTS = [
  { id: 'chest', name: 'Chest', icon: '🪶', match: ['ch_', 'pec', 'chest'] },
  { id: 'back', name: 'Back', icon: '🔧', match: ['bk_', 'lat', 'romboid', 'trap', 'back'] },
  { id: 'shoulders', name: 'Shoulders', icon: '💪', match: ['sh_', 'delt', 'shoulder'] },
  { id: 'arms', name: 'Arms', icon: '💪', match: ['ar_', 'bicep', 'tricep', 'forearm'] },
  { id: 'legs', name: 'Legs', icon: '🦵', match: ['lg_', 'quad', 'hamstring', 'calf', 'leg'] },
  { id: 'glutes', name: 'Glutes', icon: '🍑', match: ['glute'] },
  { id: 'core', name: 'Core', icon: '🤳', match: ['core', 'ab', 'oblique'] }
];

function getBodyPart(muscles) {
  if (!muscles || !muscles.length) return null;
  const m = (muscles[0] || '').toLowerCase();
  for (const part of BODY_PARTS) {
    if (part.match.some(p => m.includes(p))) return part;
  }
  return null;
}

const CATEGORY = {
  barbell: { c: 'from-red-500 to-orange-500' },
  dumbbell: { c: 'from-blue-500 to-purple-500' },
  bodyweight: { c: 'from-green-500 to-teal-500' },
  kettlebell: { c: 'from-yellow-500 to-orange-500' },
  machine: { c: 'from-gray-500 to-gray-700' },
  cable: { c: 'from-purple-500 to-pink-500' },
  default: { c: 'from-gray-600 to-gray-700' }
};

export default function Workout() {
  const [exercises, setExercises] = useState([]);
  const [logged, setLogged] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);
  const [sets, setSets] = useState(3);
  const [completing, setCompleting] = useState(false);
  const [rewards, setRewards] = useState(null);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetch('/api/exercises').then(r => r.json()).then(d => {
      setExercises(d.exercises || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const completeWorkout = async () => {
    if (logged.length === 0) return;
    setCompleting(true);
    try {
      const token = localStorage.getItem('musclemap_token');
      const res = await fetch('/api/workout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ duration_minutes: logged.length * 15, exercises: logged })
      });
      const data = await res.json();
      if (data.success) {
        setRewards(data.rewards);
        setLogged([]);
      } else {
        alert(data.error || 'Failed to complete');
      }
    } catch(e) { alert('Error completing workout'); }
    setCompleting(false);
  };

  const filtered = exercises.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const part = getBodyPart(e.primary_muscles);
    const matchFilter = !filter || (part && part.id === filter);
    return matchSearch && matchFilter;
  }).slice(0, 24);

  async function logExercise() {
    if (!adding) return;
    const token = localStorage.getItem('musclemap_token');
    try {
      await fetch('/api/workouts/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ exerciseId: adding.id, sets, reps, weight })
      });
      setLogged([...logged, { ...adding, sets, reps, weight }]);
      setSuccess(adding.name);
      setTimeout(() => setSuccess(null), 2000);
      setAdding(null);
    } catch(e) {}
  }

  const getCat = (e) => CATEGORY[e.type] || CATEGORY.default;
  const getIcon = (e) => { const p = getBodyPart(e.primary_muscles); return p ? p.icon : '💪'; };
  const getPartName = (e) => { const p = getBodyPart(e.primary_muscles); return p ? p.name : ''; };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center"><div className="animate-pulse text-3xl">🏋 Loading...</div></div>;

  return (
      <>
      {rewards && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-3xl p-8 text-center max-w-sm">
            <div className="text-5xl mb-4">🎶</div>
            <h2 className="text-2xl font-bold mb-4">Workout Complete!</h2>
            <div className="space-y-2 text-lg">
              <div>+{rewards.tuEarned} TU</div>
              <div>+{rewards.xpEarned} XP</div>
              <div className="text-gray-400">-{rewards.creditsSpent} credits</div>
            </div>
            <button onClick={()=>setRewards(null)} className="bg-purple-600 px-8 py-3 rounded-full font-bold mt-6">Awesome!</button>
          </div>
        </div>
      )}
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pb-24">
      {success && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 px-8 py-4 rounded-2xl font-bold animate-bounce">✨ {success}!</div>}
      
      {adding && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" onClick={() => setAdding(null)}>
          <div className="bg-gray-800 rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-5xl">{getIcon(adding)}</span>
              <div>
                <h2 className="text-xl font-bold">{adding.name}</h2>
                <p className="text-gray-400">{getPartName(adding)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <label className="text-sm text-gray-400">Sets</label>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button onClick={()=>setSets(Math.max(1,sets-1))} className="bg-gray-700 w-10 h-10 rounded-full text-xl">-</button>
                  <span className="text-3xl font-bold w-12 text-center">{sets}</span>
                  <button onClick={()=>setSets(sets+1)} className="bg-gray-700 w-10 h-10 rounded-full text-xl">+</button>
                </div>
              </div>
              <div className="text-center">
                <label className="text-sm text-gray-400">Reps</label>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button onClick={()=>setReps(Math.max(1,reps-1))} className="bg-gray-700 w-10 h-10 rounded-full text-xl">-</button>
                  <span className="text-3xl font-bold w-12 text-center">{reps}</span>
                  <button onClick={()=>setReps(reps+1)} className="bg-gray-700 w-10 h-10 rounded-full text-xl">+</button>
                </div>
              </div>
              <div className="text-center">
                <label className="text-sm text-gray-400">lbs</label>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button onClick={()=>setWeight(Math.max(0,weight-5))} className="bg-gray-700 w-10 h-10 rounded-full text-xl">-</button>
                  <span className="text-3xl font-bold w-12 text-center">{weight}</span>
                  <button onClick={()=>setWeight(weight+5)} className="bg-gray-700 w-10 h-10 rounded-full text-xl">+</button>
                </div>
              </div>
            </div>
            <button onClick={logExercise} className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-bold text-lg">✓ Log Exercise</button>
          </div>
        </div>
      )}

      <header className="bg-gray-900/80 backdrop-blur-lg p-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-blue-400">← Back</Link>
          <h1 className="text-xl font-bold">💪 Workout</h1>
          <div className="bg-green-600 px-3 py-1 rounded-full text-sm font-bold">{logged.length} logged</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {logged.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm text-gray-400 mb-2 uppercase">Today's Workout</h2>
            <div className="grid grid-cols-2 gap-2">
              {logged.map((e, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-2xl">{getIcon(e)}</span>
                  <div>
                    <div className="font-bold text-sm truncate">{e.name}</div>
                    <div className="text-xs text-gray-400">{e.sets}x{e.reps} {e.weight>0?`${e.weight}lb`:''}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={completeWorkout} disabled={completing} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-2xl font-bold text-lg mt-4 transition-all">{completing ? "Completing..." : "Complete Workout"}</button>
          </div>
        )}

        <input
          type="text"
          placeholder="🔍 Search exercises..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-800 rounded-2xl p-4 mb-4 text-lg"
        />

        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          <button onClick={()=>setFilter(null)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${!filter?'bg-purple-600':'bg-gray-700'}`}>All</button>
          {BODY_PARTS.map(p => (
            <button key={p.id} onClick={()=>setFilter(p.id)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${filter===p.id?'bg-purple-600':'bg-gray-700'}`}>
              {p.icon} {p.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map(e => (
            <button
              key={e.id}
              onClick={() => setAdding(e)}
              className={`bg-gradient-to-br ${getCat(e).c} rounded-2xl p-4 text-left hover:scale-105 active:scale-95 transition-all shadow-lg`}
            >
              <div className="text-3xl mb-2">{getIcon(e)}</div>
              <div className="font-bold text-sm truncate">{e.name}</div>
              <div className="text-xs opacity-80">{getPartName(e)}</div>
            </button>
          ))}
        </div>
      </main>
    </div>
  </>
  );
}