// MuscleMap Storybook Documentation
// Complete stories and configuration for all UI components

// ═══════════════════════════════════════════════════════════════════════════
// STORYBOOK CONFIGURATION FILES
// ═══════════════════════════════════════════════════════════════════════════

export const storybookMain = `// .storybook/main.js
module.exports = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-viewport',
  ],
  framework: { name: '@storybook/react-vite', options: {} },
  docs: { autodocs: 'tag' },
};`;

export const storybookPreview = `// .storybook/preview.js
import '../src/index.css';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
  backgrounds: {
    default: 'dark',
    values: [
      { name: 'dark', value: '#0f172a' },
      { name: 'slate', value: '#1e293b' },
      { name: 'light', value: '#f8fafc' },
    ],
  },
  viewport: {
    viewports: {
      mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
      tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
      desktop: { name: 'Desktop', styles: { width: '1440px', height: '900px' } },
    },
  },
};

export const decorators = [
  (Story) => <div className="min-h-screen bg-slate-900 text-white p-4"><Story /></div>,
];`;

// ═══════════════════════════════════════════════════════════════════════════
// BUTTON STORIES
// ═══════════════════════════════════════════════════════════════════════════

export const ButtonStories = `// src/components/Button.stories.jsx
import React from 'react';

const Button = ({ children, variant = 'primary', size = 'md', disabled, loading, fullWidth, icon, onClick }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600',
    outline: 'border-2 border-teal-500 text-teal-400 hover:bg-teal-500/10',
    ghost: 'text-slate-300 hover:bg-slate-800',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5', lg: 'px-6 py-3 text-lg', xl: 'px-8 py-4 text-xl' };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={\`rounded-xl font-semibold transition-all active:scale-[0.98] \${variants[variant]} \${sizes[size]} \${fullWidth ? 'w-full' : ''} \${disabled ? 'opacity-50 cursor-not-allowed' : ''}\`}
    >
      {loading ? <span className="animate-spin">⟳</span> : icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default {
  title: 'Foundation/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
};

export const Primary = { args: { children: 'Primary Button', variant: 'primary' } };
export const Secondary = { args: { children: 'Secondary', variant: 'secondary' } };
export const Outline = { args: { children: 'Outline', variant: 'outline' } };
export const Ghost = { args: { children: 'Ghost', variant: 'ghost' } };
export const Danger = { args: { children: 'Delete', variant: 'danger' } };
export const Success = { args: { children: 'Complete', variant: 'success' } };

export const AllVariants = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="success">Success</Button>
    </div>
  ),
};

export const AllSizes = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

export const WithIcon = { args: { children: 'Add Exercise', icon: '➕', variant: 'primary' } };
export const Loading = { args: { children: 'Saving...', loading: true } };
export const Disabled = { args: { children: 'Disabled', disabled: true } };
export const FullWidth = { args: { children: 'Full Width', fullWidth: true } };`;

// ═══════════════════════════════════════════════════════════════════════════
// INPUT STORIES
// ═══════════════════════════════════════════════════════════════════════════

export const InputStories = `// src/components/Input.stories.jsx
import React, { useState } from 'react';

const Input = ({ label, placeholder, value, onChange, error, helperText, icon, disabled, type = 'text' }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={\`w-full px-4 py-3 rounded-xl bg-slate-800/50 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 \${icon ? 'pl-10' : ''} \${error ? 'border-red-500' : 'border-slate-700'} \${disabled ? 'opacity-50 cursor-not-allowed' : ''}\`}
      />
    </div>
    {error && <p className="text-sm text-red-400">{error}</p>}
    {helperText && !error && <p className="text-sm text-slate-500">{helperText}</p>}
  </div>
);

export default {
  title: 'Foundation/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    helperText: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};

export const Default = { args: { label: 'Email', placeholder: 'Enter your email...' } };
export const WithError = { args: { label: 'Email', value: 'invalid@', error: 'Please enter a valid email' } };
export const WithHelper = { args: { label: 'Password', type: 'password', helperText: 'Must be 8+ characters' } };
export const WithIcon = { args: { label: 'Username', placeholder: 'Enter username', icon: '👤' } };
export const Disabled = { args: { label: 'Disabled', value: 'Cannot edit', disabled: true } };

export const AllInputTypes = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Input label="Text" placeholder="Enter text..." />
      <Input label="Email" type="email" placeholder="email@example.com" icon="📧" />
      <Input label="Password" type="password" placeholder="••••••••" />
      <Input label="With Error" error="This field is required" />
    </div>
  ),
};`;

// ═══════════════════════════════════════════════════════════════════════════
// SELECTION STORIES
// ═══════════════════════════════════════════════════════════════════════════

export const SelectionStories = `// src/components/Selection.stories.jsx
import React, { useState } from 'react';

const Toggle = ({ checked, onChange }) => (
  <button onClick={() => onChange(!checked)} className={\`w-12 h-7 rounded-full transition-colors \${checked ? 'bg-teal-500' : 'bg-slate-600'}\`}>
    <div className={\`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ml-1 \${checked ? 'translate-x-5' : ''}\`} />
  </button>
);

const Chip = ({ children, selected, onClick }) => (
  <button onClick={onClick} className={\`px-3 py-1.5 rounded-full text-sm font-medium transition-all \${selected ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}\`}>{children}</button>
);

const SegmentedControl = ({ options, value, onChange }) => (
  <div className="flex bg-slate-800 rounded-xl p-1">
    {options.map(opt => <button key={opt} onClick={() => onChange(opt)} className={\`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize \${value === opt ? 'bg-teal-500 text-white' : 'text-slate-400'}\`}>{opt}</button>)}
  </div>
);

export default { title: 'Foundation/Selection', tags: ['autodocs'] };

export const ToggleDemo = {
  render: () => {
    const [enabled, setEnabled] = useState(true);
    return <label className="flex items-center gap-3"><Toggle checked={enabled} onChange={setEnabled} /><span>Notifications</span></label>;
  },
};

export const ChipsDemo = {
  render: () => {
    const [selected, setSelected] = useState(['Push']);
    const chips = ['Push', 'Pull', 'Legs', 'Core'];
    const toggle = (c) => setSelected(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c]);
    return <div className="flex gap-2">{chips.map(c => <Chip key={c} selected={selected.includes(c)} onClick={() => toggle(c)}>{c}</Chip>)}</div>;
  },
};

export const SegmentedDemo = {
  render: () => {
    const [value, setValue] = useState('week');
    return <div className="max-w-xs"><SegmentedControl options={['day', 'week', 'month']} value={value} onChange={setValue} /></div>;
  },
};`;

// ═══════════════════════════════════════════════════════════════════════════
// CARD STORIES
// ═══════════════════════════════════════════════════════════════════════════

export const CardStories = `// src/components/Card.stories.jsx
import React from 'react';

const ExerciseCard = ({ name, category, muscles, equipment, difficulty }) => {
  const diffColors = { beginner: 'bg-emerald-500/20 text-emerald-400', intermediate: 'bg-amber-500/20 text-amber-400', advanced: 'bg-red-500/20 text-red-400' };
  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden hover:border-slate-600 cursor-pointer">
      <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative">
        <span className="text-5xl opacity-30">🏋️</span>
        <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-slate-900/80 text-xs">{category}</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg">{name}</h3>
          <span className={\`px-2 py-0.5 rounded-md text-xs capitalize \${diffColors[difficulty]}\`}>{difficulty}</span>
        </div>
        <p className="text-sm text-slate-400 mb-3">{equipment}</p>
        <div className="flex flex-wrap gap-1.5">{muscles.map(m => <span key={m} className="px-2 py-1 rounded-md bg-teal-500/20 text-teal-300 text-xs">{m}</span>)}</div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, unit, trend, trendValue, color = 'teal' }) => {
  const colors = { teal: 'from-teal-500/20 to-teal-600/10 border-teal-500/30', orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30', purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30' };
  return (
    <div className={\`p-4 rounded-xl bg-gradient-to-br \${colors[color]} border\`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        {trend && <span className={\`text-xs font-medium \${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}\`}>{trend === 'up' ? '↑' : '↓'} {trendValue}</span>}
      </div>
      <p className="text-2xl font-bold">{value}<span className="text-sm text-slate-400 ml-1">{unit}</span></p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
};

export default { title: 'Components/Card', tags: ['autodocs'] };

export const ExerciseCardDemo = {
  render: () => (
    <div className="max-w-sm">
      <ExerciseCard name="Barbell Squat" category="Legs" muscles={['Quads', 'Glutes', 'Core']} equipment="Barbell" difficulty="intermediate" />
    </div>
  ),
};

export const StatCardsDemo = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 max-w-md">
      <StatCard icon="🏋️" label="Workouts" value="24" trend="up" trendValue="12%" color="teal" />
      <StatCard icon="📊" label="Volume" value="48.5K" unit="lbs" trend="up" trendValue="8%" color="orange" />
      <StatCard icon="🔥" label="Streak" value="7" unit="days" color="purple" />
      <StatCard icon="🏆" label="PRs" value="3" color="teal" />
    </div>
  ),
};`;

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS STORIES
// ═══════════════════════════════════════════════════════════════════════════

export const ProgressStories = `// src/components/Progress.stories.jsx
import React from 'react';

const ProgressBar = ({ label, value, max, color = 'teal' }) => {
  const pct = (value / max) * 100;
  const colors = { teal: 'from-teal-500 to-teal-400', orange: 'from-orange-500 to-orange-400', gradient: 'from-teal-500 via-yellow-500 to-red-500' };
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm"><span className="text-slate-400">{label}</span><span className="font-mono">{value}/{max}</span></div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className={\`h-full bg-gradient-to-r \${colors[color]} rounded-full transition-all\`} style={{ width: \`\${pct}%\` }} /></div>
    </div>
  );
};

const CircularProgress = ({ value, label, size = 'md', color = 'teal' }) => {
  const sizes = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' };
  const r = 45, circ = 2 * Math.PI * r;
  return (
    <div className={\`relative \${sizes[size]}\`}>
      <svg className="w-full h-full -rotate-90"><circle cx="50%" cy="50%" r={\`\${r}%\`} fill="none" stroke="#334155" strokeWidth="8" /><circle cx="50%" cy="50%" r={\`\${r}%\`} fill="none" stroke="#14B8A6" strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (value / 100) * circ} /></svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-bold">{value}%</span><span className="text-xs text-slate-400">{label}</span></div>
    </div>
  );
};

const MuscleActivationBar = ({ muscle, activation, isPrimary }) => {
  const getColor = (a) => a >= 80 ? 'from-red-500 to-red-400' : a >= 60 ? 'from-orange-500 to-orange-400' : a >= 40 ? 'from-yellow-500 to-yellow-400' : 'from-teal-500 to-teal-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between"><span className={\`font-medium \${isPrimary ? 'text-white' : 'text-slate-400'}\`}>{muscle}</span><span className="text-sm font-mono text-slate-400">{activation}%</span></div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className={\`h-full bg-gradient-to-r \${getColor(activation)} rounded-full\`} style={{ width: \`\${activation}%\` }} /></div>
    </div>
  );
};

const AchievementBadge = ({ name, icon, tier, unlocked, progress, total }) => {
  const tiers = { bronze: 'from-amber-700 to-amber-900 border-amber-600', silver: 'from-slate-300 to-slate-500 border-slate-400', gold: 'from-yellow-400 to-yellow-600 border-yellow-500', platinum: 'from-slate-200 to-cyan-200 border-cyan-300', diamond: 'from-blue-300 to-purple-300 border-purple-400' };
  return (
    <div className={\`text-center \${!unlocked ? 'opacity-40 grayscale' : ''}\`}>
      <div className={\`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br \${tiers[tier]} border-2 flex items-center justify-center shadow-lg relative\`}>
        <span className="text-2xl">{icon}</span>
        {unlocked && <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-xs">✓</div>}
      </div>
      <p className="text-xs mt-2 text-slate-300">{name}</p>
      {progress && <p className="text-xs text-slate-500">{Math.round((progress / total) * 100)}%</p>}
    </div>
  );
};

export default { title: 'Components/Progress', tags: ['autodocs'] };

export const ProgressBarsDemo = {
  render: () => (
    <div className="max-w-md space-y-4">
      <ProgressBar label="Workout Progress" value={75} max={100} color="teal" />
      <ProgressBar label="Weekly Goal" value={5} max={7} color="orange" />
      <ProgressBar label="Muscle Activation" value={92} max={100} color="gradient" />
    </div>
  ),
};

export const CircularProgressDemo = {
  render: () => (
    <div className="flex gap-8">
      <CircularProgress value={75} label="Complete" size="lg" />
      <CircularProgress value={45} label="Today" size="md" />
      <CircularProgress value={92} label="Goal" size="md" />
    </div>
  ),
};

export const MuscleActivationDemo = {
  render: () => (
    <div className="max-w-md space-y-3">
      <MuscleActivationBar muscle="Quadriceps" activation={95} isPrimary />
      <MuscleActivationBar muscle="Glutes" activation={85} isPrimary />
      <MuscleActivationBar muscle="Hamstrings" activation={45} />
      <MuscleActivationBar muscle="Core" activation={60} />
      <MuscleActivationBar muscle="Calves" activation={25} />
    </div>
  ),
};

export const AchievementBadgesDemo = {
  render: () => (
    <div className="flex gap-6">
      <AchievementBadge name="7 Day Streak" icon="🔥" tier="bronze" unlocked />
      <AchievementBadge name="First PR" icon="⚡" tier="silver" unlocked />
      <AchievementBadge name="10K Reps" icon="💪" tier="gold" unlocked />
      <AchievementBadge name="Elite" icon="👑" tier="platinum" progress={75} total={100} />
      <AchievementBadge name="Legend" icon="💎" tier="diamond" progress={25} total={100} />
    </div>
  ),
};`;

// ═══════════════════════════════════════════════════════════════════════════
// WORKOUT COMPONENT STORIES
// ═══════════════════════════════════════════════════════════════════════════

export const WorkoutStories = `// src/components/Workout.stories.jsx
import React, { useState, useEffect } from 'react';

const RestTimer = ({ duration, onComplete, onSkip }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  useEffect(() => { if (timeLeft <= 0) { onComplete(); return; } const t = setTimeout(() => setTimeLeft(t => t - 1), 1000); return () => clearTimeout(t); }, [timeLeft]);
  const pct = (timeLeft / duration) * 100, r = 45, circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90"><circle cx="50%" cy="50%" r={\`\${r}%\`} fill="none" stroke="#334155" strokeWidth="8" /><circle cx="50%" cy="50%" r={\`\${r}%\`} fill="none" stroke="#14B8A6" strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} /></svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-5xl font-bold font-mono">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span><span className="text-slate-400 uppercase text-sm">Rest</span></div>
      </div>
      <div className="flex gap-3"><button className="px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium">Pause</button><button onClick={onSkip} className="px-6 py-3 rounded-xl bg-teal-500 text-white font-semibold">Skip</button></div>
    </div>
  );
};

const SetLogger = ({ targetReps, targetWeight, onComplete }) => {
  const [reps, setReps] = useState(targetReps);
  const [weight, setWeight] = useState(targetWeight);
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1"><label className="block text-xs text-slate-400 uppercase mb-2">Weight</label><input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full px-4 py-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-2xl font-bold font-mono text-center" /></div>
        <div className="flex-1"><label className="block text-xs text-slate-400 uppercase mb-2">Reps</label><input type="number" value={reps} onChange={(e) => setReps(Number(e.target.value))} className="w-full px-4 py-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-2xl font-bold font-mono text-center" /></div>
      </div>
      <div className="flex gap-2"><div className="flex-1 flex gap-1">{[-5, -2.5, 2.5, 5].map(n => <button key={n} onClick={() => setWeight(w => Math.max(0, w + n))} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-400 font-medium">{n > 0 ? '+' : ''}{n}</button>)}</div></div>
      <button onClick={() => onComplete({ reps, weight })} className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-lg">Complete Set</button>
    </div>
  );
};

const ExerciseProgress = ({ sets, currentSet }) => (
  <div className="flex items-center justify-center gap-2">
    {sets.map((_, i) => <div key={i} className={\`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm \${i < currentSet ? 'bg-teal-500 text-white' : i === currentSet ? 'bg-teal-500/20 text-teal-400 border-2 border-teal-500 scale-110' : 'bg-slate-800 text-slate-500 border border-slate-700'}\`}>{i < currentSet ? '✓' : i + 1}</div>)}
  </div>
);

const LeaderboardItem = ({ rank, name, score, unit, isCurrentUser }) => {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const rankBg = { 1: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30', 2: 'from-slate-400/20 to-slate-500/10 border-slate-400/30', 3: 'from-amber-600/20 to-amber-700/10 border-amber-600/30' };
  return (
    <div className={\`flex items-center gap-3 p-3 rounded-xl border \${isCurrentUser ? 'bg-teal-500/10 border-teal-500/30' : rankBg[rank] ? \`bg-gradient-to-r \${rankBg[rank]}\` : 'bg-slate-800/50 border-slate-700/50'}\`}>
      <div className="w-8 text-center font-bold">{medals[rank] || rank}</div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center font-bold">{name[0]}</div>
      <div className="flex-1"><p className={\`font-medium \${isCurrentUser ? 'text-teal-300' : ''}\`}>{name}</p></div>
      <div className="text-right"><span className="font-bold font-mono">{score.toLocaleString()}</span><span className="text-sm text-slate-400 ml-1">{unit}</span></div>
    </div>
  );
};

export default { title: 'Workout/Components', tags: ['autodocs'] };

export const RestTimerDemo = {
  render: () => <div className="flex justify-center"><RestTimer duration={90} onComplete={() => alert('Done!')} onSkip={() => alert('Skipped!')} /></div>,
};

export const SetLoggerDemo = {
  render: () => <div className="max-w-md"><SetLogger targetReps={8} targetWeight={135} onComplete={(d) => console.log('Completed:', d)} /></div>,
};

export const ExerciseProgressDemo = {
  render: () => <ExerciseProgress sets={[{}, {}, {}, {}]} currentSet={2} />,
};

export const LeaderboardDemo = {
  render: () => (
    <div className="max-w-md space-y-2">
      <LeaderboardItem rank={1} name="Alex M." score={12450} unit="lbs" />
      <LeaderboardItem rank={2} name="Sarah K." score={11200} unit="lbs" />
      <LeaderboardItem rank={3} name="Mike R." score={10800} unit="lbs" />
      <LeaderboardItem rank={4} name="You" score={9500} unit="lbs" isCurrentUser />
      <LeaderboardItem rank={5} name="Emma L." score={8900} unit="lbs" />
    </div>
  ),
};`;

// ═══════════════════════════════════════════════════════════════════════════
// SPECIALIZED COMPONENT STORIES
// ═══════════════════════════════════════════════════════════════════════════

export const SpecializedStories = `// src/components/Specialized.stories.jsx
import React, { useState } from 'react';

const XPProgress = ({ currentXP, levelXP, level }) => (
  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">{level}</div>
        <div><p className="text-sm text-slate-400">Level {level}</p><p className="text-xs text-slate-500">{levelXP - currentXP} XP to next</p></div>
      </div>
      <span className="text-lg font-bold font-mono text-purple-400">{currentXP} XP</span>
    </div>
    <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: \`\${(currentXP / levelXP) * 100}%\` }} /></div>
  </div>
);

const DailyQuests = ({ quests }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between"><h3 className="font-semibold">Daily Quests</h3><span className="text-sm text-slate-400">{quests.filter(q => q.completed).length}/{quests.length}</span></div>
    {quests.map((q, i) => (
      <div key={i} className={\`flex items-center gap-3 p-3 rounded-xl \${q.completed ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-slate-800/50 border border-slate-700/50'}\`}>
        <div className={\`w-8 h-8 rounded-full flex items-center justify-center \${q.completed ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-400'}\`}>{q.completed ? '✓' : i + 1}</div>
        <div className="flex-1"><p className={\`font-medium \${q.completed ? 'line-through text-slate-400' : ''}\`}>{q.name}</p></div>
        <span className={\`text-sm font-mono \${q.completed ? 'text-teal-400' : 'text-purple-400'}\`}>+{q.xp} XP</span>
      </div>
    ))}
  </div>
);

const MiniChart = ({ data, color = 'teal' }) => {
  const max = Math.max(...data.map(d => d.value));
  const colors = { teal: 'from-teal-600 to-teal-400', purple: 'from-purple-600 to-purple-400' };
  return (
    <div className="h-20 flex items-end gap-1">
      {data.map((p, i) => <div key={i} className="flex-1 flex flex-col items-center gap-1"><div className={\`w-full rounded-t bg-gradient-to-t \${colors[color]}\`} style={{ height: \`\${(p.value / max) * 100}%\` }} /><span className="text-xs text-slate-600">{p.label}</span></div>)}
    </div>
  );
};

const PRChart = ({ data, exercise }) => {
  const maxW = Math.max(...data.map(d => d.weight)), minW = Math.min(...data.map(d => d.weight));
  return (
    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
      <h4 className="font-semibold mb-4">{exercise} PR History</h4>
      <div className="h-40 flex items-end gap-4">
        {data.map((p, i) => { const h = ((p.weight - minW + 20) / (maxW - minW + 40)) * 100; return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-xs font-mono text-teal-400">{p.weight}</span>
            <div className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t" style={{ height: \`\${h}%\` }} />
            <span className="text-xs text-slate-500">{p.date}</span>
          </div>
        ); })}
      </div>
    </div>
  );
};

export default { title: 'Specialized/Components', tags: ['autodocs'] };

export const XPProgressDemo = {
  render: () => <div className="max-w-md"><XPProgress currentXP={2450} levelXP={3000} level={12} /></div>,
};

export const DailyQuestsDemo = {
  render: () => (
    <div className="max-w-md">
      <DailyQuests quests={[
        { name: 'Complete 1 workout', xp: 100, completed: true },
        { name: 'Log 10 sets', xp: 50, completed: true },
        { name: 'Burn 300 calories', xp: 75, completed: false },
        { name: 'Try a new exercise', xp: 150, completed: false },
      ]} />
    </div>
  ),
};

export const MiniChartDemo = {
  render: () => (
    <div className="max-w-md space-y-6">
      <MiniChart data={[{ label: 'M', value: 40 }, { label: 'T', value: 65 }, { label: 'W', value: 55 }, { label: 'T', value: 80 }, { label: 'F', value: 70 }, { label: 'S', value: 90 }, { label: 'S', value: 85 }]} color="teal" />
      <MiniChart data={[{ label: 'M', value: 40 }, { label: 'T', value: 65 }, { label: 'W', value: 55 }, { label: 'T', value: 80 }, { label: 'F', value: 70 }, { label: 'S', value: 90 }, { label: 'S', value: 85 }]} color="purple" />
    </div>
  ),
};

export const PRChartDemo = {
  render: () => (
    <div className="max-w-md">
      <PRChart exercise="Bench Press" data={[{ date: 'Oct', weight: 135 }, { date: 'Nov', weight: 155 }, { date: 'Dec', weight: 165 }, { date: 'Jan', weight: 185 }]} />
    </div>
  ),
};`;

// ═══════════════════════════════════════════════════════════════════════════
// PAGES STORIES
// ═══════════════════════════════════════════════════════════════════════════

export const PageStories = `// src/pages/Pages.stories.jsx
import React from 'react';
import { HomePage, ExerciseLibraryPage, ExerciseDetailPage, WorkoutSessionPage, ProfilePage, ProgressPage } from './pages';

export default { title: 'Pages', tags: ['autodocs'] };

export const Home = { render: () => <HomePage /> };
export const ExerciseLibrary = { render: () => <ExerciseLibraryPage /> };
export const ExerciseDetail = { render: () => <ExerciseDetailPage /> };
export const WorkoutSession = { render: () => <WorkoutSessionPage /> };
export const Profile = { render: () => <ProfilePage /> };
export const Progress = { render: () => <ProgressPage /> };`;

// ═══════════════════════════════════════════════════════════════════════════
// SETUP INSTRUCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const setupInstructions = `
# MuscleMap Storybook Setup Guide

## Prerequisites
- Node.js 18+
- npm or yarn

## Installation

\`\`\`bash
# Create React + Vite project
npm create vite@latest musclemap-ui -- --template react

# Navigate to project
cd musclemap-ui

# Install dependencies
npm install

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install Storybook
npx storybook@latest init

# Install additional addons
npm install -D @storybook/addon-a11y @storybook/addon-viewport
\`\`\`

## Configure Tailwind (tailwind.config.js)

\`\`\`javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: { 400: '#2DD4BF', 500: '#14B8A6', 600: '#0D9488' },
      },
    },
  },
  plugins: [],
};
\`\`\`

## Configure CSS (src/index.css)

\`\`\`css
@tailwind base;
@tailwind components;
@tailwind utilities;
\`\`\`

## File Structure

\`\`\`
musclemap-ui/
├── .storybook/
│   ├── main.js          # Storybook config
│   └── preview.js       # Global decorators
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── buttons.jsx
│   │   │   ├── inputs.jsx
│   │   │   ├── cards.jsx
│   │   │   ├── progress.jsx
│   │   │   ├── navigation.jsx
│   │   │   ├── overlays.jsx
│   │   │   ├── workout.jsx
│   │   │   └── specialized.jsx
│   │   └── *.stories.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── ExerciseLibrary.jsx
│   │   ├── ExerciseDetail.jsx
│   │   ├── WorkoutSession.jsx
│   │   ├── Profile.jsx
│   │   └── Progress.jsx
│   └── index.css
└── package.json
\`\`\`

## Running Storybook

\`\`\`bash
npm run storybook
\`\`\`

Opens at http://localhost:6006

## Building for Production

\`\`\`bash
npm run build-storybook
\`\`\`

## Component Categories

1. **Foundation** - Buttons, Inputs, Selections, Sliders
2. **Components** - Cards, Progress, Navigation, Overlays
3. **Workout** - Timers, Loggers, Heatmaps, Leaderboards
4. **Specialized** - Gamification, Social, Analytics, Settings
5. **Pages** - Complete screen layouts
`;

export default {
  storybookMain,
  storybookPreview,
  ButtonStories,
  InputStories,
  SelectionStories,
  CardStories,
  ProgressStories,
  WorkoutStories,
  SpecializedStories,
  PageStories,
  setupInstructions,
};
