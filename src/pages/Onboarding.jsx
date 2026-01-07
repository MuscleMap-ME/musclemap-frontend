import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '@musclemap/shared';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../store/authStore';

const ARCHETYPE_ICONS = {
  'bodybuilder': '💪',
  'gymnast': '🤸',
  'powerlifter': '🏋️',
  'crossfit': '🔥',
  'martial-artist': '🥋',
  'runner': '🏃',
  'climber': '🧗',
  'strongman': '🦾',
  'functional': '⚡',
  'swimmer': '🏊',
};

const ADDITIONAL_EQUIPMENT = [
  { id: 'pullupBar', name: 'Pull-up Bar', icon: '🔩', desc: 'Pull-ups, chin-ups, hanging' },
  { id: 'dipBars', name: 'Dip Bars', icon: '⬜', desc: 'Dips, leg raises, rows' },
  { id: 'rings', name: 'Gym Rings', icon: '⭕', desc: 'Ring rows, muscle-ups' },
  { id: 'bench', name: 'Bench', icon: '🪑', desc: 'Step-ups, elevated pushups' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { login } = useUser();
  const { token, user } = useAuth();
  const [step, setStep] = useState(1);
  const [archetype, setArchetype] = useState(null);
  const [archetypes, setArchetypes] = useState([]);
  const [equipment, setEquipment] = useState({ type: 'bodyweight', kettlebellCount: 1, extras: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/archetypes')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setArchetypes(data.data.map(a => ({
            id: a.id,
            name: a.name,
            icon: ARCHETYPE_ICONS[a.id] || '🎯',
            desc: a.description || a.philosophy || ''
          })));
        }
      })
      .catch(console.error);
  }, []);

  const handleComplete = async () => {
    if (!archetype) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/archetypes/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ archetypeId: archetype.id })
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error?.message || data.error || data.message || 'Failed';
        throw new Error(errorMsg);
      }
      login({ ...user, archetype: archetype.id }, token);
      navigate('/dashboard');
    } catch (err) { setError(extractErrorMessage(err, 'Failed to select archetype')); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="flex gap-2 mb-8">
          <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-gray-700'}`} />
          <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-gray-700'}`} />
        </div>

        {step === 1 && (
          <>
            <h1 className="text-3xl font-black mb-2">Choose Your Path</h1>
            <p className="text-gray-400 mb-6">What kind of athlete do you want to become?</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {archetypes.length === 0 ? (
                <div className="col-span-full text-center text-gray-400 py-8">Loading...</div>
              ) : archetypes.map(a => (
                <button key={a.id} onClick={() => setArchetype(a)} className={`p-4 rounded-xl text-left transition-all ${archetype?.id === a.id ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-800 hover:bg-gray-700'}`}>
                  <div className="text-3xl mb-2">{a.icon}</div>
                  <div className="font-bold">{a.name}</div>
                  <div className="text-xs text-gray-400 line-clamp-2">{a.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => archetype && setStep(2)} disabled={!archetype} className="w-full p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-xl font-bold">Continue</button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-3xl font-black mb-2">Your Equipment</h1>
            <p className="text-gray-400 mb-6">What do you have access to?</p>
            <div className="space-y-3 mb-6">
              {[
                { id: 'bodyweight', name: 'Bodyweight Only', icon: '🤸', desc: 'No equipment needed' },
                { id: 'kettlebell', name: 'Kettlebells', icon: '🔔', desc: 'Kettlebells + bodyweight' },
                { id: 'freeweight', name: 'Full Gym', icon: '🏋️', desc: 'Barbells, dumbbells, machines' },
              ].map(eq => (
                <button key={eq.id} onClick={() => setEquipment({...equipment, type: eq.id})} className={`w-full p-4 rounded-xl text-left flex items-center gap-4 ${equipment.type === eq.id ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-800 hover:bg-gray-700'}`}>
                  <span className="text-3xl">{eq.icon}</span>
                  <div>
                    <div className="font-bold">{eq.name}</div>
                    <div className="text-sm text-gray-400">{eq.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {equipment.type === 'kettlebell' && (
              <div className="bg-gray-800 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-400 mb-3">How many kettlebells do you have?</p>
                <div className="flex gap-2">
                  {[1, 2].map(n => (
                    <button key={n} onClick={() => setEquipment({...equipment, kettlebellCount: n})} className={`flex-1 p-3 rounded-lg font-bold ${equipment.kettlebellCount === n ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                      {n} Kettlebell{n > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(equipment.type === 'bodyweight' || equipment.type === 'kettlebell') && (
              <div className="mb-6">
                <p className="text-sm text-gray-400 mb-3">Do you have access to any of these? (optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  {ADDITIONAL_EQUIPMENT.map(eq => {
                    const isSelected = equipment.extras.includes(eq.id);
                    return (
                      <button
                        key={eq.id}
                        onClick={() => setEquipment({
                          ...equipment,
                          extras: isSelected
                            ? equipment.extras.filter(e => e !== eq.id)
                            : [...equipment.extras, eq.id]
                        })}
                        className={`p-3 rounded-xl text-left transition-all ${isSelected ? 'bg-green-600 ring-2 ring-green-400' : 'bg-gray-800 hover:bg-gray-700'}`}
                      >
                        <div className="text-2xl mb-1">{eq.icon}</div>
                        <div className="font-bold text-sm">{eq.name}</div>
                        <div className="text-xs text-gray-400">{eq.desc}</div>
                      </button>
                    );
                  })}
                </div>
                {equipment.extras.length === 0 && (
                  <p className="text-xs text-gray-500 mt-3">
                    No extras? No problem! We'll work with what you have.
                  </p>
                )}
              </div>
            )}

            {error && <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm mb-4">{error}</div>}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold">Back</button>
              <button onClick={handleComplete} disabled={loading} className="flex-1 p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold disabled:opacity-50">
                {loading ? 'Creating Plan...' : '🚀 Start Training'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
