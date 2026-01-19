// MuscleMap Specialized Components
// Advanced and domain-specific UI components

import React, { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// WORKOUT PRESCRIPTION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const PrescriptionCard = ({ constraints = { time: 45, equipment: ['barbell', 'dumbbell'], location: 'gym' }, prescription = null, onGenerate, isGenerating = false }) => (
  <div className="rounded-2xl bg-gradient-to-br from-teal-500/10 to-blue-500/10 border border-teal-500/30 p-5">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-2xl">🧠</div>
      <div><h3 className="font-bold text-lg">AI Prescription</h3><p className="text-sm text-slate-400">Optimized for your constraints</p></div>
    </div>
    <div className="flex flex-wrap gap-2 mb-4">
      <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-sm">⏱️ {constraints.time} min</span>
      <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-sm">📍 {constraints.location}</span>
      {constraints.equipment.map(eq => <span key={eq} className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-sm capitalize">{eq}</span>)}
    </div>
    {prescription ? (
      <div className="space-y-3">
        <div className="flex justify-between"><span className="text-slate-400">Exercises</span><span className="font-bold">{prescription.exercises}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Est. Duration</span><span className="font-bold">{prescription.duration} min</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Muscle Coverage</span><span className="font-bold text-teal-400">{prescription.coverage}%</span></div>
        <button className="w-full py-3 rounded-xl bg-teal-500 text-white font-semibold mt-2">Start Workout</button>
      </div>
    ) : (
      <button onClick={onGenerate} disabled={isGenerating} className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold flex items-center justify-center gap-2">
        {isGenerating ? <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generating...</> : <>✨ Generate Prescription</>}
      </button>
    )}
  </div>
);

export const ConstraintSelector = ({ constraints, onChange }) => {
  const [time, setTime] = useState(constraints?.time || 45);
  const [equipment, setEquipment] = useState(constraints?.equipment || []);
  const [location, setLocation] = useState(constraints?.location || 'gym');
  const allEquipment = ['barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bodyweight', 'bands'];
  const locations = ['gym', 'home', 'outdoor', 'hotel'];
  const handleEquipmentToggle = (eq) => { const newEq = equipment.includes(eq) ? equipment.filter(e => e !== eq) : [...equipment, eq]; setEquipment(newEq); onChange({ time, equipment: newEq, location }); };
  return (
    <div className="space-y-6">
      <div><label className="block text-sm font-medium text-slate-300 mb-3">Available Time</label><div className="flex items-center gap-4"><input type="range" min="15" max="120" step="5" value={time} onChange={(e) => { setTime(Number(e.target.value)); onChange({ time: Number(e.target.value), equipment, location }); }} className="flex-1 h-2 bg-slate-700 rounded-full" /><span className="w-20 text-center font-mono text-lg text-teal-400">{time} min</span></div></div>
      <div><label className="block text-sm font-medium text-slate-300 mb-3">Location</label><div className="grid grid-cols-4 gap-2">{locations.map(loc => <button key={loc} onClick={() => { setLocation(loc); onChange({ time, equipment, location: loc }); }} className={`py-2 rounded-xl text-sm font-medium capitalize ${location === loc ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{loc}</button>)}</div></div>
      <div><label className="block text-sm font-medium text-slate-300 mb-3">Equipment</label><div className="flex flex-wrap gap-2">{allEquipment.map(eq => <button key={eq} onClick={() => handleEquipmentToggle(eq)} className={`px-3 py-2 rounded-xl text-sm font-medium capitalize ${equipment.includes(eq) ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>{eq}</button>)}</div></div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAL & COMMUNITY COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const HangoutCard = ({ hangout = { name: 'Morning Lifters', location: 'Central Park', distance: '0.3 mi', members: 5, activity: 'Outdoor Workout', time: '7:00 AM' }, onJoin }) => (
  <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-4 hover:border-slate-600">
    <div className="flex items-start gap-4 mb-3">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center text-2xl">🏃</div>
      <div className="flex-1 min-w-0"><h3 className="font-bold truncate">{hangout.name}</h3><p className="text-sm text-slate-400">📍 {hangout.location} • {hangout.distance}</p></div>
    </div>
    <div className="flex flex-wrap gap-2 mb-3">
      <span className="px-2 py-1 rounded-lg bg-slate-700/50 text-sm">{hangout.activity}</span>
      <span className="px-2 py-1 rounded-lg bg-slate-700/50 text-sm">⏰ {hangout.time}</span>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">{Array.from({ length: Math.min(hangout.members, 3) }).map((_, i) => <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs">{String.fromCharCode(65 + i)}</div>)}</div>
        <span className="text-sm text-slate-400">{hangout.members > 3 ? `+${hangout.members - 3} more` : `${hangout.members} members`}</span>
      </div>
      <button onClick={onJoin} className="px-4 py-2 rounded-xl bg-teal-500 text-white font-medium text-sm">Join</button>
    </div>
  </div>
);

export const ActivityFeed = ({ activities = [{ user: 'Alex', action: 'completed', target: 'Push Day A', time: '2m ago', icon: '✅' }, { user: 'Sarah', action: 'set PR', target: 'Bench Press 185×8', time: '15m ago', icon: '🏆' }, { user: 'Mike', action: 'joined', target: 'Morning Lifters', time: '1h ago', icon: '👋' }] }) => (
  <div className="space-y-3">
    {activities.map((a, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-bold">{a.user[0]}</div>
        <div className="flex-1 min-w-0"><p className="text-sm"><span className="font-semibold">{a.user}</span><span className="text-slate-400"> {a.action} </span><span className="text-teal-400">{a.target}</span></p><p className="text-xs text-slate-500">{a.time}</p></div>
        <span className="text-xl">{a.icon}</span>
      </div>
    ))}
  </div>
);

export const ChallengeCard = ({ challenge = { name: 'January Push Challenge', description: 'Complete 1000 push-ups', progress: 650, goal: 1000, participants: 234, daysLeft: 12, prize: 500 } }) => (
  <div className="rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-5">
    <div className="flex items-start justify-between mb-4">
      <div><span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium">Challenge</span><h3 className="font-bold text-lg mt-2">{challenge.name}</h3><p className="text-sm text-slate-400">{challenge.description}</p></div>
      <div className="text-right"><p className="text-xs text-slate-400">{challenge.daysLeft} days left</p><p className="text-sm text-yellow-400 font-medium">🏆 {challenge.prize} credits</p></div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="flex justify-between text-sm"><span className="text-slate-400">Your Progress</span><span className="font-mono">{challenge.progress}/{challenge.goal}</span></div>
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${(challenge.progress / challenge.goal) * 100}%` }} /></div>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{challenge.participants} participants</span>
      <button className="text-sm text-purple-400 font-medium">View Leaderboard →</button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// GAMIFICATION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const XPProgress = ({ currentXP = 2450, levelXP = 3000, level = 12 }) => (
  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">{level}</div>
        <div><p className="text-sm text-slate-400">Level {level}</p><p className="text-xs text-slate-500">{levelXP - currentXP} XP to next</p></div>
      </div>
      <span className="text-lg font-bold font-mono text-purple-400">{currentXP} XP</span>
    </div>
    <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${(currentXP / levelXP) * 100}%` }} /></div>
  </div>
);

export const DailyQuests = ({ quests = [{ name: 'Complete 1 workout', xp: 100, completed: true }, { name: 'Log 10 sets', xp: 50, completed: true }, { name: 'Burn 300 calories', xp: 75, completed: false, progress: 210, goal: 300 }, { name: 'Try a new exercise', xp: 150, completed: false }] }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between"><h3 className="font-semibold">Daily Quests</h3><span className="text-sm text-slate-400">{quests.filter(q => q.completed).length}/{quests.length} done</span></div>
    {quests.map((quest, i) => (
      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${quest.completed ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-slate-800/50 border border-slate-700/50'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${quest.completed ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{quest.completed ? '✓' : (i + 1)}</div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${quest.completed ? 'line-through text-slate-400' : ''}`}>{quest.name}</p>
          {quest.progress && !quest.completed && <div className="flex items-center gap-2 mt-1"><div className="flex-1 h-1 bg-slate-700 rounded-full"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${(quest.progress / quest.goal) * 100}%` }} /></div><span className="text-xs text-slate-500">{quest.progress}/{quest.goal}</span></div>}
        </div>
        <span className={`text-sm font-mono ${quest.completed ? 'text-teal-400' : 'text-purple-400'}`}>+{quest.xp} XP</span>
      </div>
    ))}
  </div>
);

export const LevelUpModal = ({ isOpen, onClose, newLevel = 13, rewards = [] }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-gradient-to-br from-purple-900 to-pink-900 rounded-3xl p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">Level Up!</h2>
        <p className="text-slate-300 mb-6">You&apos;ve reached level {newLevel}</p>
        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold mb-6 shadow-lg shadow-purple-500/50">{newLevel}</div>
        {rewards.length > 0 && <div className="space-y-2 mb-6"><p className="text-sm text-slate-400">Rewards Unlocked</p>{rewards.map((r, i) => <div key={i} className="py-2 px-4 rounded-xl bg-white/10">{r.icon} {r.name}</div>)}</div>}
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-white text-purple-900 font-bold">Continue</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const MiniChart = ({ data = [{ label: 'M', value: 40 }, { label: 'T', value: 65 }, { label: 'W', value: 55 }, { label: 'T', value: 80 }, { label: 'F', value: 70 }, { label: 'S', value: 90 }, { label: 'S', value: 85 }], color = 'teal' }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  return (
    <div className="h-20 flex items-end gap-1">
      {data.map((point, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className={`w-full rounded-t bg-gradient-to-t ${color === 'teal' ? 'from-teal-600 to-teal-400' : 'from-purple-600 to-purple-400'} transition-all hover:opacity-80`} style={{ height: `${(point.value / maxValue) * 100}%` }} />
          <span className="text-xs text-slate-600">{point.label}</span>
        </div>
      ))}
    </div>
  );
};

export const InsightCard = ({ insight = { type: 'positive', title: 'Great Progress!', message: 'Your volume increased 15% this week', icon: '📈' } }) => {
  const colors = { positive: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30', warning: 'from-amber-500/20 to-orange-500/20 border-amber-500/30', info: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30' };
  return <div className={`rounded-xl bg-gradient-to-r ${colors[insight.type]} border p-4 flex items-start gap-3`}><span className="text-2xl">{insight.icon}</span><div><h4 className="font-semibold">{insight.title}</h4><p className="text-sm text-slate-300">{insight.message}</p></div></div>;
};

export const WeeklyHeatmap = ({ data = [3, 0, 2, 4, 1, 5, 0] }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxValue = Math.max(...data);
  const getColor = (v) => { if (v === 0) return 'bg-slate-800'; const i = v / maxValue; return i > 0.75 ? 'bg-teal-400' : i > 0.5 ? 'bg-teal-500' : i > 0.25 ? 'bg-teal-600' : 'bg-teal-700'; };
  return <div className="flex gap-2">{days.map((day, i) => <div key={day} className="flex-1 text-center"><div className={`aspect-square rounded-lg ${getColor(data[i])} mb-1`} /><span className="text-xs text-slate-500">{day[0]}</span></div>)}</div>;
};

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const EquipmentSelector = ({ selected = [], onChange }) => {
  const equipment = [{ id: 'barbell', name: 'Barbell', icon: '🏋️' }, { id: 'dumbbell', name: 'Dumbbells', icon: '💪' }, { id: 'kettlebell', name: 'Kettlebell', icon: '🔔' }, { id: 'cable', name: 'Cable Machine', icon: '🔗' }, { id: 'machine', name: 'Machines', icon: '⚙️' }, { id: 'bodyweight', name: 'Bodyweight', icon: '🤸' }, { id: 'bands', name: 'Bands', icon: '〰️' }, { id: 'pullupbar', name: 'Pull-up Bar', icon: '📏' }];
  const handleToggle = (id) => onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  return <div className="grid grid-cols-2 gap-3">{equipment.map(eq => <button key={eq.id} onClick={() => handleToggle(eq.id)} className={`p-4 rounded-xl border text-left ${selected.includes(eq.id) ? 'bg-teal-500/20 border-teal-500/50' : 'bg-slate-800/50 border-slate-700/50'}`}><span className="text-2xl">{eq.icon}</span><p className="font-medium mt-2">{eq.name}</p></button>)}</div>;
};

export const UnitToggle = ({ unit = 'lbs', onChange }) => <div className="flex bg-slate-800 rounded-xl p-1">{['lbs', 'kg'].map(u => <button key={u} onClick={() => onChange(u)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium uppercase ${unit === u ? 'bg-teal-500 text-white' : 'text-slate-400'}`}>{u}</button>)}</div>;

export const RestTimerSettings = ({ defaultRest = 90, onChange }) => {
  const [custom, setCustom] = useState(defaultRest);
  const presets = [30, 60, 90, 120, 180];
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Quick Presets</p>
      <div className="flex gap-2">{presets.map(s => <button key={s} onClick={() => { setCustom(s); onChange(s); }} className={`flex-1 py-2 rounded-xl text-sm font-medium ${custom === s ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{s < 60 ? `${s}s` : `${s / 60}m`}</button>)}</div>
      <div className="space-y-2"><p className="text-sm text-slate-400">Custom Duration</p><div className="flex items-center gap-4"><input type="range" min="15" max="300" step="15" value={custom} onChange={(e) => { setCustom(Number(e.target.value)); onChange(Number(e.target.value)); }} className="flex-1" /><span className="w-16 text-center font-mono text-teal-400">{Math.floor(custom / 60)}:{(custom % 60).toString().padStart(2, '0')}</span></div></div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKOUT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

export const WorkoutBuilder = ({ exercises = [], onAdd, onRemove }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between"><h3 className="font-semibold">Exercises ({exercises.length})</h3><button onClick={onAdd} className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 text-sm font-medium">+ Add Exercise</button></div>
    <div className="space-y-2">
      {exercises.map((ex, i) => (
        <div key={ex.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-400">{i + 1}</div>
          <div className="flex-1 min-w-0"><h4 className="font-medium truncate">{ex.name}</h4><p className="text-sm text-slate-400">{ex.sets} sets × {ex.reps} reps</p></div>
          <div className="flex gap-1"><button className="w-8 h-8 rounded-lg bg-slate-700/50 text-slate-400">↑</button><button className="w-8 h-8 rounded-lg bg-slate-700/50 text-slate-400">↓</button><button onClick={() => onRemove(ex.id)} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400">×</button></div>
        </div>
      ))}
    </div>
    {exercises.length === 0 && <div className="text-center py-8 text-slate-400"><span className="text-4xl mb-4 block">📋</span><p>No exercises added yet</p></div>}
  </div>
);

export const SupersetGroup = ({ exercises = [], groupName = 'Superset A' }) => (
  <div className="rounded-xl border-2 border-dashed border-purple-500/50 p-3">
    <div className="flex items-center gap-2 mb-3"><span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-medium">{groupName}</span><span className="text-xs text-slate-500">No rest between</span></div>
    <div className="space-y-2">{exercises.map((ex, i) => <div key={i} className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold">{String.fromCharCode(65 + i)}</div><span className="text-sm">{ex.name}</span></div>)}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS & FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════

export const ToastNotification = ({ message, type = 'success', isVisible, onClose }) => {
  useEffect(() => { if (isVisible) { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); } }, [isVisible, onClose]);
  if (!isVisible) return null;
  const colors = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500' };
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  return <div className="fixed top-4 left-4 right-4 z-50 flex justify-center"><div className={`${colors[type]} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3`}><span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">{icons[type]}</span><p className="font-medium">{message}</p><button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button></div></div>;
};

export const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', variant = 'danger' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-2">{title}</h3><p className="text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3"><button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-medium">Cancel</button><button onClick={onConfirm} className={`flex-1 py-3 rounded-xl font-medium ${variant === 'danger' ? 'bg-red-500 text-white' : 'bg-teal-500 text-white'}`}>{confirmText}</button></div>
      </div>
    </div>
  );
};

export const FeedbackPrompt = ({ onRate, onDismiss }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
      <h3 className="font-semibold mb-2">How was your workout?</h3><p className="text-sm text-slate-400 mb-4">Your feedback helps us improve</p>
      <div className="flex justify-center gap-2 mb-4">{[1, 2, 3, 4, 5].map(star => <button key={star} onClick={() => setRating(star)} className={`text-3xl transition-transform hover:scale-110 ${rating >= star ? 'opacity-100' : 'opacity-30'}`}>⭐</button>)}</div>
      {rating > 0 && <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Tell us more (optional)..." className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 resize-none mb-4" rows={3} />}
      <div className="flex gap-3"><button onClick={onDismiss} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 font-medium">Skip</button><button onClick={() => onRate({ rating, feedback })} disabled={rating === 0} className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white font-medium disabled:opacity-50">Submit</button></div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════════════════════

export const OnboardingStep = ({ step, totalSteps, title, description, image, onNext, onSkip }) => (
  <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
    <div className="flex justify-end p-4"><button onClick={onSkip} className="text-slate-400 text-sm">Skip</button></div>
    <div className="flex-1 flex flex-col items-center justify-center px-8">
      <div className="w-48 h-48 rounded-full bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center text-6xl mb-8">{image}</div>
      <h2 className="text-2xl font-bold text-center mb-4">{title}</h2>
      <p className="text-slate-400 text-center max-w-sm">{description}</p>
    </div>
    <div className="p-6">
      <div className="flex justify-center gap-2 mb-6">{Array.from({ length: totalSteps }).map((_, i) => <div key={i} className={`w-2 h-2 rounded-full ${i === step ? 'bg-teal-500' : 'bg-slate-700'}`} />)}</div>
      <button onClick={onNext} className="w-full py-4 rounded-xl bg-teal-500 text-white font-bold text-lg">{step === totalSteps - 1 ? 'Get Started' : 'Continue'}</button>
    </div>
  </div>
);

export const CoachMark = ({ step, totalSteps, title, description, onNext, onPrev, onSkip }) => (
  <div className="fixed bottom-4 left-4 right-4 z-50">
    <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-3"><span className="text-xs text-slate-400">Tip {step + 1} of {totalSteps}</span><button onClick={onSkip} className="text-xs text-slate-400">Skip all</button></div>
      <h4 className="font-semibold mb-1">{title}</h4><p className="text-sm text-slate-400 mb-4">{description}</p>
      <div className="flex gap-3">{step > 0 && <button onClick={onPrev} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white font-medium">Previous</button>}<button onClick={onNext} className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white font-medium">{step === totalSteps - 1 ? 'Finish' : 'Next'}</button></div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// DATA VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════

export const PRChart = ({ data = [{ date: 'Oct', weight: 135 }, { date: 'Nov', weight: 155 }, { date: 'Dec', weight: 165 }, { date: 'Jan', weight: 185 }], exercise = 'Bench Press' }) => {
  const maxW = Math.max(...data.map(d => d.weight)), minW = Math.min(...data.map(d => d.weight));
  return (
    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
      <h4 className="font-semibold mb-4">{exercise} PR History</h4>
      <div className="h-40 flex items-end gap-4">
        {data.map((p, i) => { const h = ((p.weight - minW + 20) / (maxW - minW + 40)) * 100; return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-xs font-mono text-teal-400">{p.weight}</span>
            <div className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t hover:from-teal-500 hover:to-teal-300" style={{ height: `${h}%` }} />
            <span className="text-xs text-slate-500">{p.date}</span>
          </div>
        ); })}
      </div>
    </div>
  );
};

export const VolumeComparison = ({ thisWeek = 45000, lastWeek = 42000 }) => {
  const change = ((thisWeek - lastWeek) / lastWeek * 100).toFixed(1), isUp = thisWeek >= lastWeek;
  return (
    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
      <div className="flex items-start justify-between mb-4">
        <div><p className="text-sm text-slate-400">This Week</p><p className="text-2xl font-bold font-mono">{(thisWeek / 1000).toFixed(1)}K<span className="text-sm text-slate-400 ml-1">lbs</span></p></div>
        <div className={`px-2 py-1 rounded-lg text-sm font-medium ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{isUp ? '↑' : '↓'} {Math.abs(change)}%</div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm"><span className="text-slate-400">vs Last Week</span><span className="text-slate-500">{(lastWeek / 1000).toFixed(1)}K lbs</span></div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex"><div className="h-full bg-slate-500" style={{ width: `${(lastWeek / Math.max(thisWeek, lastWeek)) * 100}%` }} /><div className={`h-full ${isUp ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.abs(thisWeek - lastWeek) / Math.max(thisWeek, lastWeek) * 100}%` }} /></div>
      </div>
    </div>
  );
};

export default { PrescriptionCard, ConstraintSelector, HangoutCard, ActivityFeed, ChallengeCard, XPProgress, DailyQuests, LevelUpModal, MiniChart, InsightCard, WeeklyHeatmap, EquipmentSelector, UnitToggle, RestTimerSettings, WorkoutBuilder, SupersetGroup, ToastNotification, ConfirmDialog, FeedbackPrompt, OnboardingStep, CoachMark, PRChart, VolumeComparison };
