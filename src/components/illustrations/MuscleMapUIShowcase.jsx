import React, { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// MUSCLEMAP UI COMPONENT SHOWCASE
// Interactive demonstration of the complete component library
// ═══════════════════════════════════════════════════════════════════════════

const MuscleMapUIShowcase = () => {
  const [activeSection, setActiveSection] = useState('buttons');
  const [showModal, setShowModal] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [toggleValue, setToggleValue] = useState(true);
  const [sliderValue, setSliderValue] = useState(65);
  const [selectedChips, setSelectedChips] = useState(['Push', 'Pull']);
  const [segmentValue, setSegmentValue] = useState('week');
  const [searchValue, setSearchValue] = useState('');
  const [activeTab, setActiveTab] = useState('exercises');
  const [activeNav, setActiveNav] = useState('home');

  const sections = [
    { id: 'buttons', label: 'Buttons' },
    { id: 'inputs', label: 'Inputs' },
    { id: 'cards', label: 'Cards' },
    { id: 'progress', label: 'Progress' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'overlays', label: 'Overlays' },
    { id: 'workout', label: 'Workout' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center font-bold text-lg">M</div>
            <div><h1 className="font-bold text-lg">MuscleMap UI</h1><p className="text-xs text-slate-400">Component Library</p></div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-4 overflow-x-auto">
          <div className="flex gap-2">
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeSection === s.id ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{s.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 pb-32">
        {/* BUTTONS */}
        {activeSection === 'buttons' && (
          <div className="space-y-8">
            <SectionTitle title="Buttons" description="Primary actions and interactions" />
            <ComponentGroup title="Button Variants">
              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold shadow-lg shadow-teal-500/25 hover:from-teal-600 hover:to-teal-700 active:scale-[0.98]">Primary</button>
                <button className="px-4 py-2.5 rounded-xl bg-slate-800 text-white border border-slate-700 font-semibold hover:bg-slate-700">Secondary</button>
                <button className="px-4 py-2.5 rounded-xl bg-transparent text-teal-400 border border-teal-500/50 font-semibold hover:bg-teal-500/10">Outline</button>
                <button className="px-4 py-2.5 rounded-xl bg-transparent text-slate-300 font-semibold hover:bg-slate-800">Ghost</button>
                <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow-lg shadow-red-500/25">Danger</button>
                <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25">Success</button>
              </div>
            </ComponentGroup>
            <ComponentGroup title="Button Sizes">
              <div className="flex flex-wrap items-center gap-3">
                <button className="px-3 py-1.5 text-sm rounded-lg bg-teal-500 text-white font-semibold">Small</button>
                <button className="px-4 py-2.5 text-sm rounded-xl bg-teal-500 text-white font-semibold">Medium</button>
                <button className="px-6 py-3.5 text-base rounded-xl bg-teal-500 text-white font-semibold">Large</button>
                <button className="px-8 py-4 text-lg rounded-2xl bg-teal-500 text-white font-semibold">Extra Large</button>
              </div>
            </ComponentGroup>
            <ComponentGroup title="Icon Buttons">
              <div className="flex flex-wrap gap-3">
                {['⚙️', '🔔', '❤️', '✏️', '🗑️'].map((icon, i) => (
                  <button key={i} className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center transition-all">{icon}</button>
                ))}
              </div>
            </ComponentGroup>
          </div>
        )}

        {/* INPUTS */}
        {activeSection === 'inputs' && (
          <div className="space-y-8">
            <SectionTitle title="Inputs" description="Form elements and controls" />
            <ComponentGroup title="Text Inputs">
              <div className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">Default Input</label>
                  <input type="text" placeholder="Enter text..." className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">Search Input</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                    <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Search exercises..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </div>
            </ComponentGroup>
            <ComponentGroup title="Toggle & Checkbox">
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer" onClick={() => setToggleValue(!toggleValue)}>
                  <div className="relative">
                    <div className={`w-11 h-6 rounded-full transition-colors ${toggleValue ? 'bg-teal-500' : 'bg-slate-700'}`} />
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${toggleValue ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm text-slate-300">Enable notifications</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="w-5 h-5 rounded-md border-2 border-teal-500 bg-teal-500 flex items-center justify-center"><span className="text-white text-xs">✓</span></div>
                  <span className="text-sm text-slate-300">I agree to the terms</span>
                </label>
              </div>
            </ComponentGroup>
            <ComponentGroup title="Chips">
              <div className="flex flex-wrap gap-2">
                {['Push', 'Pull', 'Legs', 'Core', 'Cardio'].map(chip => (
                  <button key={chip} onClick={() => setSelectedChips(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip])} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedChips.includes(chip) ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>{chip}</button>
                ))}
              </div>
            </ComponentGroup>
            <ComponentGroup title="Slider">
              <div className="max-w-md space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-300">Intensity</span><span className="font-mono text-teal-400">{sliderValue}%</span></div>
                <div className="relative h-2">
                  <div className="absolute inset-0 bg-slate-700 rounded-full" />
                  <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full" style={{ width: `${sliderValue}%` }} />
                  <input type="range" min="0" max="100" value={sliderValue} onChange={(e) => setSliderValue(Number(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-teal-500 pointer-events-none" style={{ left: `calc(${sliderValue}% - 8px)` }} />
                </div>
              </div>
            </ComponentGroup>
            <ComponentGroup title="Segmented Control">
              <div className="flex bg-slate-800 rounded-xl p-1 max-w-xs">
                {['day', 'week', 'month'].map(opt => (
                  <button key={opt} onClick={() => setSegmentValue(opt)} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${segmentValue === opt ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{opt}</button>
                ))}
              </div>
            </ComponentGroup>
          </div>
        )}

        {/* CARDS */}
        {activeSection === 'cards' && (
          <div className="space-y-8">
            <SectionTitle title="Cards" description="Content containers" />
            <ComponentGroup title="Exercise Cards">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[{ name: 'Barbell Squat', cat: 'Legs', muscles: ['Quads', 'Glutes'], diff: 'intermediate' }, { name: 'Bench Press', cat: 'Push', muscles: ['Chest', 'Triceps'], diff: 'beginner' }, { name: 'Deadlift', cat: 'Pull', muscles: ['Back', 'Hamstrings'], diff: 'advanced' }].map(ex => (
                  <div key={ex.name} className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden hover:border-slate-600 cursor-pointer">
                    <div className="aspect-[4/3] bg-gradient-to-br from-slate-700 to-slate-800 relative">
                      <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-50">🏋️</div>
                      <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-slate-900/80 text-xs text-slate-300">{ex.cat}</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <h3 className="font-semibold text-white text-lg">{ex.name}</h3>
                      <div className="flex flex-wrap gap-1.5">{ex.muscles.map(m => <span key={m} className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 text-xs">{m}</span>)}</div>
                      <div className="flex justify-between pt-2 border-t border-slate-700/50 text-sm">
                        <span className="text-slate-400">Barbell</span>
                        <span className={`px-2 py-0.5 rounded-md text-xs capitalize ${ex.diff === 'beginner' ? 'bg-emerald-500/20 text-emerald-400' : ex.diff === 'intermediate' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{ex.diff}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ComponentGroup>
            <ComponentGroup title="Stat Cards">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{ l: 'Workouts', v: '24', icon: '🏋️', c: 'teal' }, { l: 'Volume', v: '48.5K', u: 'lbs', icon: '📊', c: 'orange' }, { l: 'Streak', v: '7', u: 'days', icon: '🔥', c: 'purple' }, { l: 'PRs', v: '3', icon: '🏆', c: 'blue' }].map(s => (
                  <div key={s.l} className={`rounded-2xl bg-gradient-to-br border p-4 ${s.c === 'teal' ? 'from-teal-500/20 to-teal-600/10 border-teal-500/30' : s.c === 'orange' ? 'from-orange-500/20 to-orange-600/10 border-orange-500/30' : s.c === 'purple' ? 'from-purple-500/20 to-purple-600/10 border-purple-500/30' : 'from-blue-500/20 to-blue-600/10 border-blue-500/30'}`}>
                    <span className="text-xl">{s.icon}</span>
                    <div className="mt-2"><span className="text-2xl font-bold text-white font-mono">{s.v}</span>{s.u && <span className="text-sm text-slate-400 ml-1">{s.u}</span>}</div>
                    <p className="text-sm text-slate-400">{s.l}</p>
                  </div>
                ))}
              </div>
            </ComponentGroup>
          </div>
        )}

        {/* PROGRESS */}
        {activeSection === 'progress' && (
          <div className="space-y-8">
            <SectionTitle title="Progress" description="Progress indicators and badges" />
            <ComponentGroup title="Progress Bars">
              <div className="max-w-md space-y-4">
                {[{ l: 'Workout Progress', v: 75, c: 'teal' }, { l: 'Weekly Goal', v: 71, c: 'orange' }, { l: 'Muscle Activation', v: 92, c: 'gradient' }].map(p => (
                  <div key={p.l} className="space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-slate-400">{p.l}</span><span className="font-mono text-slate-300">{p.v}%</span></div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full bg-gradient-to-r rounded-full ${p.c === 'teal' ? 'from-teal-500 to-teal-400' : p.c === 'orange' ? 'from-orange-500 to-orange-400' : 'from-teal-500 via-yellow-500 to-red-500'}`} style={{ width: `${p.v}%` }} /></div>
                  </div>
                ))}
              </div>
            </ComponentGroup>
            <ComponentGroup title="Circular Progress">
              <div className="flex flex-wrap gap-8">
                {[{ v: 75, l: 'Complete', s: 'lg' }, { v: 45, l: 'Today', s: 'md' }, { v: 92, l: 'Goal', s: 'md' }].map((c, i) => {
                  const circ = 2 * Math.PI * 45;
                  return (
                    <div key={i} className={`relative ${c.s === 'lg' ? 'w-32 h-32' : 'w-24 h-24'}`}>
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#334155" strokeWidth="6" />
                        <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#14B8A6" strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (c.v / 100) * circ} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-bold text-white font-mono">{c.v}%</span><span className="text-xs text-slate-400">{c.l}</span></div>
                    </div>
                  );
                })}
              </div>
            </ComponentGroup>
            <ComponentGroup title="Muscle Activation Bars">
              <div className="max-w-md space-y-3">
                {[{ m: 'Quadriceps', a: 95, p: true }, { m: 'Glutes', a: 85, p: true }, { m: 'Hamstrings', a: 45 }, { m: 'Core', a: 60 }, { m: 'Calves', a: 25 }].map(({ m, a, p }) => (
                  <div key={m} className="space-y-1">
                    <div className="flex justify-between"><span className={`text-sm ${p ? 'font-medium text-white' : 'text-slate-400'}`}>{m}</span><span className="text-sm font-mono text-slate-400">{a}%</span></div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full bg-gradient-to-r rounded-full ${a >= 80 ? 'from-red-500 to-red-400' : a >= 60 ? 'from-orange-500 to-orange-400' : a >= 40 ? 'from-yellow-500 to-yellow-400' : 'from-teal-500 to-teal-400'}`} style={{ width: `${a}%` }} /></div>
                  </div>
                ))}
              </div>
            </ComponentGroup>
            <ComponentGroup title="Achievement Badges">
              <div className="flex flex-wrap gap-6">
                {[{ n: '7 Day Streak', i: '🔥', t: 'bronze', u: true }, { n: 'First PR', i: '⚡', t: 'silver', u: true }, { n: '10K Reps', i: '💪', t: 'gold', u: true }, { n: 'Elite', i: '👑', t: 'platinum', p: 75 }, { n: 'Legend', i: '💎', t: 'diamond', p: 25 }].map(b => {
                  const tiers = { bronze: 'from-amber-700 to-amber-900 border-amber-600', silver: 'from-slate-300 to-slate-500 border-slate-400', gold: 'from-yellow-400 to-yellow-600 border-yellow-500', platinum: 'from-slate-200 to-cyan-200 border-cyan-300', diamond: 'from-cyan-200 to-blue-300 border-cyan-400' };
                  return (
                    <div key={b.n} className={`${!b.u ? 'opacity-40 grayscale' : ''}`}>
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tiers[b.t]} border-2 flex items-center justify-center shadow-lg relative`}>
                        <span className="text-2xl">{b.i}</span>
                        {b.u && <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs">✓</div>}
                      </div>
                      <p className="text-xs text-center mt-2 text-slate-300">{b.n}</p>
                      {b.p && <div className="mt-1"><div className="h-1 bg-slate-700 rounded-full"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${b.p}%` }} /></div><p className="text-xs text-slate-500 text-center">{b.p}%</p></div>}
                    </div>
                  );
                })}
              </div>
            </ComponentGroup>
          </div>
        )}

        {/* NAVIGATION */}
        {activeSection === 'navigation' && (
          <div className="space-y-8">
            <SectionTitle title="Navigation" description="Navigation components" />
            <ComponentGroup title="Tab Bar">
              <div className="flex bg-slate-800 rounded-xl p-1">
                {['exercises', 'workouts', 'progress'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium capitalize ${activeTab === tab ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white'}`}>{tab}</button>
                ))}
              </div>
            </ComponentGroup>
            <ComponentGroup title="Bottom Navigation">
              <div className="bg-slate-900 rounded-xl overflow-hidden">
                <div className="flex items-center justify-around h-16 border-t border-slate-800">
                  {[{ id: 'home', icon: '🏠', label: 'Home' }, { id: 'workouts', icon: '🏋️', label: 'Workouts' }, { id: 'progress', icon: '📊', label: 'Progress' }, { id: 'profile', icon: '👤', label: 'Profile' }].map(item => (
                    <button key={item.id} onClick={() => setActiveNav(item.id)} className={`flex flex-col items-center gap-1 px-4 py-2 ${activeNav === item.id ? 'text-teal-400' : 'text-slate-500'}`}>
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </ComponentGroup>
          </div>
        )}

        {/* OVERLAYS */}
        {activeSection === 'overlays' && (
          <div className="space-y-8">
            <SectionTitle title="Overlays" description="Modals, sheets, and alerts" />
            <ComponentGroup title="Modal & Bottom Sheet">
              <div className="flex gap-4">
                <button onClick={() => setShowModal(true)} className="px-4 py-2.5 rounded-xl bg-teal-500 text-white font-semibold">Open Modal</button>
                <button onClick={() => setShowBottomSheet(true)} className="px-4 py-2.5 rounded-xl bg-teal-500 text-white font-semibold">Open Bottom Sheet</button>
              </div>
            </ComponentGroup>
            <ComponentGroup title="Alerts">
              <div className="space-y-3 max-w-md">
                {[{ t: 'info', c: 'blue', h: 'New feature available', m: 'Check out the new workout tracking!' }, { t: 'success', c: 'emerald', h: 'Workout complete!', m: 'Great job finishing your workout.' }, { t: 'warning', c: 'amber', h: 'Low battery', m: 'Your device battery is below 20%.' }].map(a => (
                  <div key={a.t} className={`p-4 rounded-xl bg-${a.c}-500/10 border border-${a.c}-500/30 text-${a.c}-300`}>
                    <h4 className="font-semibold mb-1">{a.h}</h4>
                    <p className="text-sm opacity-90">{a.m}</p>
                  </div>
                ))}
              </div>
            </ComponentGroup>
          </div>
        )}

        {/* WORKOUT */}
        {activeSection === 'workout' && (
          <div className="space-y-8">
            <SectionTitle title="Workout Components" description="Exercise and training UI" />
            <ComponentGroup title="Rest Timer">
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative w-44 h-44">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#334155" strokeWidth="8" />
                      <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#14B8A6" strokeWidth="8" strokeLinecap="round" strokeDasharray={283} strokeDashoffset={0} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-5xl font-bold text-white font-mono">1:30</span><span className="text-slate-400 uppercase text-sm">Rest</span></div>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium">Pause</button>
                    <button className="px-6 py-3 rounded-xl bg-teal-500 text-white font-semibold">Skip Rest</button>
                  </div>
                </div>
              </div>
            </ComponentGroup>
            <ComponentGroup title="Set Progress">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i < 3 ? 'bg-teal-500 text-white' : i === 3 ? 'bg-teal-500/20 text-teal-400 border-2 border-teal-500 scale-110' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                    {i < 3 ? '✓' : i}
                  </div>
                ))}
              </div>
            </ComponentGroup>
            <ComponentGroup title="Leaderboard">
              <div className="max-w-md space-y-2">
                {[{ r: 1, n: 'Alex M.', s: 12450 }, { r: 2, n: 'Sarah K.', s: 11200 }, { r: 3, n: 'Mike R.', s: 10800 }, { r: 4, n: 'You', s: 9500, u: true }, { r: 5, n: 'Emma L.', s: 8900 }].map(item => {
                  const rs = item.r === 1 ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white' : item.r === 2 ? 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800' : item.r === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white' : 'bg-slate-700 text-slate-300';
                  const em = item.r === 1 ? '🥇' : item.r === 2 ? '🥈' : item.r === 3 ? '🥉' : null;
                  return (
                    <div key={item.r} className={`flex items-center gap-3 p-3 rounded-xl ${item.u ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-slate-800/50 border border-slate-700/50'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${rs}`}>{em || item.r}</div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center"><span className="font-semibold text-white">{item.n.charAt(0)}</span></div>
                      <div className="flex-1"><p className={`font-medium ${item.u ? 'text-teal-300' : 'text-white'}`}>{item.n}{item.u && <span className="text-teal-400 ml-1">(You)</span>}</p></div>
                      <span className="font-bold text-white font-mono">{item.s.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </ComponentGroup>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="font-semibold text-white text-lg">Swap Exercise</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-4">
              <p className="text-slate-400 mb-4">Choose an alternative exercise.</p>
              <div className="space-y-2">{['Dumbbell Bench Press', 'Incline Press', 'Push-Ups'].map(ex => <button key={ex} className="w-full p-3 rounded-xl bg-slate-700/50 text-white text-left hover:bg-slate-700">{ex}</button>)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet */}
      {showBottomSheet && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBottomSheet(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-3xl" style={{ height: '50%' }}>
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-slate-600 rounded-full" /></div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-700">
              <h2 className="font-semibold text-white text-lg">Filter Exercises</h2>
              <button onClick={() => setShowBottomSheet(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-4">
              <p className="text-slate-400 mb-4">Select muscle groups to filter:</p>
              <div className="flex flex-wrap gap-2">{['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs'].map(m => <button key={m} className="px-4 py-2 rounded-full bg-slate-700 text-slate-300 text-sm font-medium hover:bg-teal-500 hover:text-white">{m}</button>)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionTitle = ({ title, description }) => (<div className="mb-6"><h2 className="text-2xl font-bold text-white mb-1">{title}</h2><p className="text-slate-400">{description}</p></div>);
const ComponentGroup = ({ title, children }) => (<div className="space-y-4"><h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</h3>{children}</div>);

export default MuscleMapUIShowcase;
