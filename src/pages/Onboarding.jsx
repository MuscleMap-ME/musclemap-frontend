import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../store/authStore';
import { ArchetypeSelector } from '../components/archetypes';

const ADDITIONAL_EQUIPMENT = [
  { id: 'pullupBar', name: 'Pull-up Bar', icon: '🔩', desc: 'Pull-ups, chin-ups, hanging' },
  { id: 'dipBars', name: 'Dip Bars', icon: '⬜', desc: 'Dips, leg raises, rows' },
  { id: 'rings', name: 'Gym Rings', icon: '⭕', desc: 'Ring rows, muscle-ups' },
  { id: 'bench', name: 'Bench', icon: '🪑', desc: 'Step-ups, elevated pushups' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { login } = useUser();
  const { user, token } = useAuth();
  const [step, setStep] = useState(1);
  const [archetype, setArchetype] = useState(null);
  const [equipment, setEquipment] = useState({ type: 'bodyweight', kettlebellCount: 1, extras: [] });

  /**
   * Handle archetype selection from ArchetypeSelector
   * The selector already calls the API, so we just update state and move to step 2
   */
  const handleArchetypeSelected = (archetypeId, archetypeObject) => {
    setArchetype({ id: archetypeId, ...archetypeObject });
    // Update user context with selected archetype
    login({ ...user, archetype: archetypeId }, token);
    // Move to equipment selection
    setStep(2);
  };

  /**
   * Complete onboarding and navigate to dashboard
   */
  const handleComplete = () => {
    // Archetype already saved by ArchetypeSelector
    // Equipment preferences can be saved here if needed
    navigate('/dashboard');
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundColor: '#0a0a0f',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15), transparent 50%), radial-gradient(circle at 50% 100%, rgba(168, 85, 247, 0.1), transparent 50%)',
      }}
    >
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="archetype-selector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            {/* Logo Header for Step 1 */}
            <div className="text-center pt-8 pb-4 px-4">
              <img
                src="/logo.png"
                alt="MuscleMap"
                className="w-16 h-16 mx-auto mb-3 rounded-xl shadow-lg shadow-purple-500/20"
              />
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Welcome to MuscleMap
              </h1>
              <p className="text-gray-400 text-sm mt-1">Let&apos;s personalize your experience</p>
            </div>

            {/* ArchetypeSelector handles the full drill-down flow */}
            <ArchetypeSelector onComplete={handleArchetypeSelected} />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="equipment-selector"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen p-4"
          >
            <div className="max-w-2xl mx-auto pt-8">
              {/* Logo Header for Step 2 */}
              <div className="text-center mb-8">
                <img
                  src="/logo.png"
                  alt="MuscleMap"
                  className="w-16 h-16 mx-auto mb-3 rounded-xl shadow-lg shadow-purple-500/20"
                />
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                  Almost There
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  {archetype?.name ? `Great choice! Now let's set up your equipment.` : `Let's set up your equipment.`}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="flex gap-2 mb-8">
                <div className="h-2 flex-1 rounded-full bg-blue-500" />
                <div className="h-2 flex-1 rounded-full bg-blue-500" />
              </div>

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
                      No extras? No problem! We&apos;ll work with what you have.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold">Back</button>
                <button onClick={handleComplete} className="flex-1 p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold">
                  Start Training
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
