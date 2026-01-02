import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import clsx from 'clsx';
import { api } from '../utils/api';
import { DailyTip, MilestoneProgress } from '../components/tips';

// Professional icon components (no emojis)
const Icons = {
  Home: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  Workout: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7"/></svg>,
  Journey: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>,
  Stats: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  Message: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  Wallet: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Map: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Community: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  Trophy: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  Customize: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>,
  Play: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Bolt: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  Chart: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Arrow: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>,
  Bell: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
};

// Archetype configurations
const ARCHETYPES = {
  bodybuilder: { label: 'Bodybuilder', gradient: 'from-rose-600 to-orange-600', icon: 'muscle' },
  powerlifter: { label: 'Powerlifter', gradient: 'from-slate-600 to-zinc-800', icon: 'weight' },
  gymnast: { label: 'Gymnast', gradient: 'from-violet-600 to-fuchsia-600', icon: 'rings' },
  crossfit: { label: 'CrossFit', gradient: 'from-amber-500 to-orange-600', icon: 'bolt' },
  sprinter: { label: 'Sprinter', gradient: 'from-sky-500 to-cyan-500', icon: 'run' },
  martial_artist: { label: 'Martial Artist', gradient: 'from-red-700 to-rose-900', icon: 'fist' },
  default: { label: 'Explorer', gradient: 'from-gray-600 to-gray-800', icon: 'compass' }
};

const getArchetype = (id) => ARCHETYPES[id] || ARCHETYPES.default;

// Stat Card Component
const StatCard = ({ label, value, sublabel, trend, icon: Icon }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
  >
    <div className="flex items-start justify-between mb-2">
      <div className="p-2 bg-white/10 rounded-lg">
        {Icon && <Icon />}
      </div>
      {trend && (
        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', 
          trend > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
        )}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className="text-2xl font-semibold text-white">{value}</div>
    <div className="text-sm text-gray-400">{label}</div>
    {sublabel && <div className="text-xs text-gray-500 mt-1">{sublabel}</div>}
  </motion.div>
);

// Navigation Item
const NavItem = ({ to, icon: Icon, label, active, badge }) => (
  <Link to={to} className={clsx(
    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
    active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
  )}>
    <Icon />
    <span className="font-medium">{label}</span>
    {badge && (
      <span className="ml-auto bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
    )}
  </Link>
);

// Quick Action Button
const QuickAction = ({ to, icon: Icon, label, description, gradient }) => (
  <Link to={to}>
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'p-5 rounded-2xl bg-gradient-to-br border border-white/10 cursor-pointer group',
        gradient
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          <Icon />
        </div>
        <Icons.Arrow />
      </div>
      <div className="font-semibold text-white">{label}</div>
      <div className="text-sm text-white/70">{description}</div>
    </motion.div>
  </Link>
);

// System Card for nested navigation
const SystemCard = ({ title, items, icon: Icon }) => (
  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
    <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
      <div className="p-2 bg-white/10 rounded-lg"><Icon /></div>
      <h3 className="font-semibold text-white">{title}</h3>
    </div>
    <div className="p-2">
      {items.map((item, i) => (
        <Link key={i} to={item.to} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-gray-400 group-hover:text-white">
              {item.icon && <item.icon />}
            </div>
            <div>
              <div className="font-medium text-white">{item.label}</div>
              {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
            </div>
          </div>
          <Icons.Arrow />
        </Link>
      ))}
    </div>
  </div>
);

export default function Dashboard() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    api.progress.stats().then(setStats).catch(() => {});
    api.wallet.balance().then(setWallet).catch(() => {});
  }, []);

  const arch = getArchetype(user?.archetype);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="MuscleMap" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold text-lg hidden sm:block">MuscleMap</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Link to="/messages" className="p-2 rounded-xl hover:bg-white/5 transition-all relative">
              <Icons.Message />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
            </Link>
            <Link to="/wallet" className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
              <Icons.Wallet />
              <span className="font-semibold">{wallet?.wallet?.balance?.toFixed(0) || user?.credits || 0}</span>
            </Link>
            <button onClick={logout} className="p-2 rounded-xl hover:bg-white/5 transition-all text-gray-400 hover:text-white">
              <Icons.Settings />
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 fixed left-0 top-16 bottom-0 border-r border-white/5 p-4 overflow-y-auto">
          <nav className="space-y-1">
            <NavItem to="/dashboard" icon={Icons.Home} label="Overview" active />
            <NavItem to="/workout" icon={Icons.Play} label="Train" />
            <NavItem to="/journey" icon={Icons.Journey} label="Journey" />
            <NavItem to="/progression" icon={Icons.Chart} label="Progress" />
            <NavItem to="/messages" icon={Icons.Message} label="Messages" badge="3" />
          </nav>
          
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-wider px-4 mb-2">Social</div>
            <nav className="space-y-1">
              <NavItem to="/community" icon={Icons.Community} label="Community" />
              <NavItem to="/competitions" icon={Icons.Trophy} label="Competitions" />
              <NavItem to="/locations" icon={Icons.Map} label="Locations" />
            </nav>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-wider px-4 mb-2">Account</div>
            <nav className="space-y-1">
              <NavItem to="/wallet" icon={Icons.Wallet} label="Wallet" />
              <NavItem to="/skins" icon={Icons.Customize} label="Customize" />
              <NavItem to="/settings" icon={Icons.Settings} label="Settings" />
              <NavItem to="/profile" icon={Icons.User} label="Profile" />
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-5xl mx-auto">
            {/* Welcome Section */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-2xl lg:text-3xl font-bold mb-1">
                Welcome back, {user?.username || 'Athlete'}
              </h1>
              <p className="text-gray-400">Continue your training journey</p>
            </motion.div>

            {/* Current Path Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={clsx(
                'relative overflow-hidden rounded-2xl p-6 mb-8 bg-gradient-to-br',
                arch.gradient
              )}
            >
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/70 mb-1">Current Path</div>
                  <div className="text-2xl font-bold">{arch.label}</div>
                  <div className="flex items-center gap-4 mt-4">
                    <div>
                      <div className="text-2xl font-bold">{stats?.level || 1}</div>
                      <div className="text-xs text-white/70">Level</div>
                    </div>
                    <div className="w-px h-8 bg-white/20"></div>
                    <div>
                      <div className="text-2xl font-bold">{stats?.xp || 0}</div>
                      <div className="text-xs text-white/70">XP</div>
                    </div>
                    <div className="w-px h-8 bg-white/20"></div>
                    <div>
                      <div className="text-2xl font-bold">0%</div>
                      <div className="text-xs text-white/70">Complete</div>
                    </div>
                  </div>
                </div>
                <Link to="/journey" className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-medium transition-all">
                  View Journey
                </Link>
              </div>
              {/* Progress bar */}
              <div className="relative mt-6">
                <div className="h-1 bg-white/20 rounded-full">
                  <div className="h-1 bg-white rounded-full w-[15%]"></div>
                </div>
              </div>
            </motion.div>

            {/* Daily Tip */}
            <DailyTip />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Icons.Bolt} label="Day Streak" value={stats?.streak || 0} trend={12} />
              <StatCard icon={Icons.Chart} label="Workouts" value={stats?.workouts || 0} sublabel="This month" />
              <StatCard icon={Icons.Trophy} label="Achievements" value="12" sublabel="3 new" />
              <StatCard icon={Icons.Shield} label="VIP Status" value={wallet?.ranking?.vip_tier || 'Bronze'} />
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickAction 
                  to="/workout" 
                  icon={Icons.Play} 
                  label="Start Workout" 
                  description="Begin your training session"
                  gradient="from-emerald-600 to-teal-600"
                />
                <QuickAction 
                  to="/journey" 
                  icon={Icons.Journey} 
                  label="Journey Map" 
                  description="Track your progression path"
                  gradient="from-violet-600 to-purple-600"
                />
                <QuickAction 
                  to="/exercises" 
                  icon={Icons.Stats} 
                  label="Exercise Library" 
                  description="Browse all exercises"
                  gradient="from-blue-600 to-cyan-600"
                />
              </div>
            </div>

            {/* Milestones Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Milestones</h2>
                <Link to="/journey" className="text-sm text-purple-400 hover:text-purple-300">
                  View all
                </Link>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                <MilestoneProgress limit={4} />
              </div>
            </div>

            {/* System Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SystemCard
                title="Training"
                icon={Icons.Workout}
                items={[
                  { to: '/workout', icon: Icons.Play, label: 'Active Workout', description: 'Start or continue training' },
                  { to: '/exercises', icon: Icons.Stats, label: 'Exercise Library', description: 'Browse movements' },
                  { to: '/progression', icon: Icons.Chart, label: 'Progression', description: 'Track your gains' },
                  { to: '/journey', icon: Icons.Journey, label: 'Journey Path', description: 'Your archetype roadmap' },
                ]}
              />
              
              <SystemCard 
                title="Social" 
                icon={Icons.Community}
                items={[
                  { to: '/messages', icon: Icons.Message, label: 'Messages', description: 'Direct & group chats' },
                  { to: '/community', icon: Icons.Community, label: 'Community Feed', description: 'See what others are doing' },
                  { to: '/competitions', icon: Icons.Trophy, label: 'Competitions', description: 'Join challenges' },
                  { to: '/highfives', icon: Icons.Bolt, label: 'High Fives', description: 'Encourage others' },
                ]}
              />
              
              <SystemCard 
                title="Discovery" 
                icon={Icons.Map}
                items={[
                  { to: '/locations', icon: Icons.Map, label: 'Locations', description: 'Find workout spots' },
                  { to: '/locations/1/bulletin', icon: Icons.Message, label: 'Bulletin Boards', description: 'Local community posts' },
                ]}
              />
              
              <SystemCard 
                title="Economy" 
                icon={Icons.Wallet}
                items={[
                  { to: '/wallet', icon: Icons.Wallet, label: 'Wallet', description: 'Credits & transactions' },
                  { to: '/skins', icon: Icons.Customize, label: 'Skin Store', description: 'Customize your profile' },
                  { to: '/credits', icon: Icons.Chart, label: 'Buy Credits', description: 'Purchase credit packs' },
                ]}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Nav - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/5 px-2 py-2 z-50">
        <div className="flex justify-around">
          {[
            { to: '/dashboard', icon: Icons.Home, label: 'Home', active: true },
            { to: '/workout', icon: Icons.Play, label: 'Train' },
            { to: '/journey', icon: Icons.Journey, label: 'Journey' },
            { to: '/community', icon: Icons.Community, label: 'Social' },
            { to: '/profile', icon: Icons.User, label: 'Profile' },
          ].map((item, i) => (
            <Link key={i} to={item.to} className={clsx(
              'flex flex-col items-center py-2 px-3 rounded-xl transition-all',
              item.active ? 'text-white bg-white/10' : 'text-gray-500'
            )}>
              <item.icon />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
