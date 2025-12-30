import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '@musclemap/shared';
import { useUser } from '../contexts/UserContext';

const ARCHETYPES = [
  { id: 'judoka', name: 'Judoka', icon: '🥋', desc: 'Throws, grip, hip power' },
  { id: 'wrestler', name: 'Wrestler', icon: '🤼', desc: 'Takedowns, grinding strength' },
  { id: 'boxer', name: 'Boxer', icon: '🥊', desc: 'Speed, footwork, endurance' },
  { id: 'swimmer', name: 'Swimmer', icon: '🏊', desc: 'Shoulders, back, cardio' },
  { id: 'gymnast', name: 'Gymnast', icon: '🤸', desc: 'Bodyweight mastery' },
  { id: 'sprinter', name: 'Sprinter', icon: '🏃', desc: 'Explosive leg power' },
  { id: 'powerlifter', name: 'Powerlifter', icon: '🏋️', desc: 'Squat, bench, deadlift' },
  { id: 'calisthenics', name: 'Calisthenics', icon: '💪', desc: 'Bodyweight skills' },
  { id: 'climber', name: 'Rock Climber', icon: '🧗', desc: 'Grip, pulling, core' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { login } = useUser();
  const [step, setStep] = useState(1);
  const [archetype, setArchetype] = useState(null);
  const [equipment, setEquipment] = useState({ type: 'bodyweight', kettlebellCount: 1, hasPullupBar: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async () => {
    if (!archetype) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('musclemap_token');
      const res = await fetch('/api/prescription/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ archetypeId: archetype.id, equipmentPath: equipment.type, timelineId: 'standard_12week' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const user = JSON.parse(localStorage.getItem('musclemap_user') || '{}');
      login({ ...user, archetype: archetype.id }, token);
      navigate('/dashboard');
    } catch (err) { setError(extractErrorMessage(err, 'Failed to create plan')); }
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
              {ARCHETYPES.map(a => (
                <button key={a.id} onClick={() => setArchetype(a)} className={`p-4 rounded-xl text-left transition-all ${archetype?.id === a.id ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-800 hover:bg-gray-700'}`}>
                  <div className="text-3xl mb-2">{a.icon}</div>
                  <div className="font-bold">{a.name}</div>
                  <div className="text-xs text-gray-400">{a.desc}</div>
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
              <div className="bg-gray-800 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-400 mb-3">Do you have access to any of these?</p>
                <label className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                  <input 
                    type="checkbox" 
                    checked={equipment.hasPullupBar} 
                    onChange={e => setEquipment({...equipment, hasPullupBar: e.target.checked})} 
                    className="w-5 h-5 rounded" 
                  />
                  <div>
                    <div className="font-medium">🔩 Pull-up Bar</div>
                    <div className="text-xs text-gray-400">For pull-ups, chin-ups, and hanging exercises</div>
                  </div>
                </label>
                {!equipment.hasPullupBar && (
                  <p className="text-xs text-yellow-400 mt-3">
                    💡 No pull-up bar? No problem! We'll substitute with other exercises.
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
