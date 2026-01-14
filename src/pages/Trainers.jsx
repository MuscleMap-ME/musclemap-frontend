/**
 * Trainers Page
 *
 * Browse trainers, manage trainer profile, create/manage classes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { api } from '../utils/api';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
} from '../components/glass';

// ============================================
// ICONS
// ============================================
const Icons = {
  User: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Calendar: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Users: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Clock: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  MapPin: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Star: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Plus: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Check: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Coins: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Video: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Badge: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
};

// ============================================
// CLASS CARD COMPONENT
// ============================================
function ClassCard({ classData, onEnroll, onCancel, isEnrolled, isTrainer }) {
  const startDate = new Date(classData.startAt);
  const isPast = startDate < new Date();
  const isFull = classData.currentEnrollment >= classData.capacity;

  return (
    <GlassCard className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-bold text-lg">{classData.title}</h3>
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <span className="capitalize px-2 py-0.5 rounded bg-white/10">
              {classData.difficulty}
            </span>
            <span>{classData.category}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-amber-400">
            <Icons.Coins className="w-4 h-4" />
            <span className="font-bold">{classData.creditsPerStudent}</span>
          </div>
        </div>
      </div>

      <p className="text-white/60 text-sm mb-4 line-clamp-2">
        {classData.description || 'No description provided'}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2 text-white/60">
          <Icons.Calendar className="w-4 h-4" />
          <span>{startDate.toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <Icons.Clock className="w-4 h-4" />
          <span>{startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <Icons.Users className="w-4 h-4" />
          <span>{classData.currentEnrollment || 0}/{classData.capacity}</span>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          {classData.locationType === 'virtual' ? (
            <Icons.Video className="w-4 h-4" />
          ) : (
            <Icons.MapPin className="w-4 h-4" />
          )}
          <span className="capitalize">{classData.locationType.replace('_', ' ')}</span>
        </div>
      </div>

      {!isTrainer && (
        <div className="flex gap-2">
          {isEnrolled ? (
            <GlassButton
              onClick={onCancel}
              className="flex-1 text-red-400 border-red-400/30"
            >
              Cancel Enrollment
            </GlassButton>
          ) : (
            <GlassButton
              onClick={onEnroll}
              disabled={isPast || isFull}
              className={`flex-1 ${isPast || isFull ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isPast ? 'Past Class' : isFull ? 'Class Full' : 'Enroll'}
            </GlassButton>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ============================================
// TRAINER CARD COMPONENT
// ============================================
function TrainerCard({ trainer, onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="cursor-pointer"
      onClick={() => onSelect(trainer)}
    >
      <GlassCard className="p-4 hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-2xl">
            {trainer.displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold">{trainer.displayName}</h3>
              {trainer.verified && (
                <Icons.Badge className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-white/50">
              {trainer.avgRating && (
                <div className="flex items-center gap-1">
                  <Icons.Star className="w-3 h-3 text-amber-400" />
                  <span>{trainer.avgRating.toFixed(1)}</span>
                </div>
              )}
              {trainer.totalClasses > 0 && (
                <span>{trainer.totalClasses} classes</span>
              )}
            </div>
            {trainer.specialties?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {trainer.specialties.slice(0, 3).map((s, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right text-sm">
            {trainer.perClassRateCredits && (
              <div className="flex items-center gap-1 text-amber-400">
                <Icons.Coins className="w-4 h-4" />
                <span>{trainer.perClassRateCredits}/class</span>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ============================================
// MAIN TRAINERS PAGE
// ============================================
export default function Trainers() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('browse');
  const [trainers, setTrainers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [myClasses, setMyClasses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    specialties: [],
    certifications: [],
    perClassRateCredits: 50,
  });
  const [classForm, setClassForm] = useState({
    title: '',
    description: '',
    category: 'fitness',
    difficulty: 'all',
    startAt: '',
    durationMinutes: 60,
    locationType: 'virtual',
    capacity: 20,
    creditsPerStudent: 50,
  });
  const [newSpecialty, setNewSpecialty] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [trainersRes, classesRes, profileRes, enrollmentsRes] = await Promise.all([
        api.get('/trainers?limit=50'),
        api.get('/classes?upcoming=true&limit=50'),
        api.get('/trainers/me').catch(() => ({ data: null })),
        api.get('/me/enrollments?limit=50').catch(() => ({ data: { enrollments: [] } })),
      ]);

      setTrainers(trainersRes.data.data || []);
      setClasses(classesRes.data.data || []);
      setMyProfile(profileRes.data.data);
      setMyEnrollments(enrollmentsRes.data.data?.enrollments || []);

      if (profileRes.data.data) {
        setProfileForm({
          displayName: profileRes.data.data.displayName || '',
          bio: profileRes.data.data.bio || '',
          specialties: profileRes.data.data.specialties || [],
          certifications: profileRes.data.data.certifications || [],
          perClassRateCredits: profileRes.data.data.perClassRateCredits || 50,
        });

        // Load trainer's own classes
        const myClassesRes = await api.get('/trainers/me/classes');
        setMyClasses(myClassesRes.data.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load trainer data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEnroll = async (classId) => {
    try {
      await api.post(`/classes/${classId}/enroll`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to enroll');
    }
  };

  const handleCancelEnrollment = async (classId) => {
    try {
      await api.post(`/classes/${classId}/unenroll`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to cancel enrollment');
    }
  };

  const handleCreateProfile = async () => {
    try {
      await api.post('/trainers/profile', profileForm);
      await loadData();
      setShowCreateProfile(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create profile');
    }
  };

  const handleCreateClass = async () => {
    try {
      const startAt = new Date(classForm.startAt).toISOString();
      await api.post('/classes', {
        ...classForm,
        startAt,
        trainerWagePerStudent: Math.floor(classForm.creditsPerStudent * 0.8),
      });
      await loadData();
      setShowCreateClass(false);
      setClassForm({
        title: '',
        description: '',
        category: 'fitness',
        difficulty: 'all',
        startAt: '',
        durationMinutes: 60,
        locationType: 'virtual',
        capacity: 20,
        creditsPerStudent: 50,
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create class');
    }
  };

  const addSpecialty = () => {
    if (newSpecialty && !profileForm.specialties.includes(newSpecialty)) {
      setProfileForm({
        ...profileForm,
        specialties: [...profileForm.specialties, newSpecialty],
      });
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty) => {
    setProfileForm({
      ...profileForm,
      specialties: profileForm.specialties.filter(s => s !== specialty),
    });
  };

  const isEnrolled = (classId) => {
    return myEnrollments.some(e => e.classId === classId);
  };

  if (loading) {
    return (
      <GlassSurface className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading trainers...</p>
        </div>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Trainers & Classes</h1>
            <p className="text-white/60">Find trainers, join classes, or become a trainer</p>
          </div>
          {myProfile ? (
            <GlassButton onClick={() => setShowCreateClass(true)}>
              <Icons.Plus className="w-4 h-4 mr-2" />
              Create Class
            </GlassButton>
          ) : (
            <GlassButton onClick={() => setShowCreateProfile(true)}>
              <Icons.User className="w-4 h-4 mr-2" />
              Become a Trainer
            </GlassButton>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-red-100">
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
          {['browse', 'classes', myProfile && 'my-classes', 'enrollments'].filter(Boolean).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'browse' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Featured Trainers</h2>
            {trainers.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Icons.User className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No Trainers Yet</h3>
                <p className="text-white/60">Be the first to become a trainer!</p>
              </GlassCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {trainers.map((trainer) => (
                  <TrainerCard
                    key={trainer.userId}
                    trainer={trainer}
                    onSelect={setSelectedTrainer}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Upcoming Classes</h2>
            {classes.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Icons.Calendar className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No Classes Available</h3>
                <p className="text-white/60">Check back later for upcoming classes.</p>
              </GlassCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classes.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    classData={cls}
                    isEnrolled={isEnrolled(cls.id)}
                    onEnroll={() => handleEnroll(cls.id)}
                    onCancel={() => handleCancelEnrollment(cls.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-classes' && myProfile && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">My Classes</h2>
            {myClasses.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Icons.Calendar className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No Classes Created</h3>
                <p className="text-white/60 mb-4">Create your first class to start teaching.</p>
                <GlassButton onClick={() => setShowCreateClass(true)}>
                  <Icons.Plus className="w-4 h-4 mr-2" />
                  Create Class
                </GlassButton>
              </GlassCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myClasses.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    classData={cls}
                    isTrainer
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'enrollments' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">My Enrollments</h2>
            {myEnrollments.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Icons.Calendar className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No Enrollments</h3>
                <p className="text-white/60">Browse classes and enroll to get started.</p>
              </GlassCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myEnrollments.map((enrollment) => (
                  <ClassCard
                    key={enrollment.id}
                    classData={enrollment.class}
                    isEnrolled
                    onCancel={() => handleCancelEnrollment(enrollment.classId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Profile Modal */}
        <AnimatePresence>
          {showCreateProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateProfile(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Become a Trainer</h2>
                    <button onClick={() => setShowCreateProfile(false)} className="text-white/50 hover:text-white">
                      <Icons.X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/70 text-sm mb-1">Display Name *</label>
                      <input
                        type="text"
                        value={profileForm.displayName}
                        onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        placeholder="Your trainer name"
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Bio</label>
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none resize-none"
                        placeholder="Tell students about yourself..."
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Specialties</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSpecialty}
                          onChange={(e) => setNewSpecialty(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                          placeholder="e.g., Yoga, HIIT"
                        />
                        <GlassButton onClick={addSpecialty}>Add</GlassButton>
                      </div>
                      {profileForm.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {profileForm.specialties.map((s, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-sm flex items-center gap-1"
                            >
                              {s}
                              <button onClick={() => removeSpecialty(s)} className="hover:text-white">
                                <Icons.X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Rate (credits per class)</label>
                      <input
                        type="number"
                        value={profileForm.perClassRateCredits}
                        onChange={(e) => setProfileForm({ ...profileForm, perClassRateCredits: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        min={0}
                      />
                    </div>

                    <GlassButton
                      onClick={handleCreateProfile}
                      disabled={!profileForm.displayName}
                      className="w-full"
                    >
                      Create Trainer Profile
                    </GlassButton>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Class Modal */}
        <AnimatePresence>
          {showCreateClass && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateClass(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Create Class</h2>
                    <button onClick={() => setShowCreateClass(false)} className="text-white/50 hover:text-white">
                      <Icons.X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/70 text-sm mb-1">Title *</label>
                      <input
                        type="text"
                        value={classForm.title}
                        onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        placeholder="Class title"
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Description</label>
                      <textarea
                        value={classForm.description}
                        onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none resize-none"
                        placeholder="What will students learn?"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/70 text-sm mb-1">Category</label>
                        <select
                          value={classForm.category}
                          onChange={(e) => setClassForm({ ...classForm, category: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        >
                          <option value="fitness">Fitness</option>
                          <option value="yoga">Yoga</option>
                          <option value="strength">Strength</option>
                          <option value="cardio">Cardio</option>
                          <option value="hiit">HIIT</option>
                          <option value="martial-arts">Martial Arts</option>
                          <option value="dance">Dance</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-white/70 text-sm mb-1">Difficulty</label>
                        <select
                          value={classForm.difficulty}
                          onChange={(e) => setClassForm({ ...classForm, difficulty: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        >
                          <option value="all">All Levels</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={classForm.startAt}
                        onChange={(e) => setClassForm({ ...classForm, startAt: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/70 text-sm mb-1">Duration (min)</label>
                        <input
                          type="number"
                          value={classForm.durationMinutes}
                          onChange={(e) => setClassForm({ ...classForm, durationMinutes: parseInt(e.target.value) || 60 })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                          min={5}
                          max={480}
                        />
                      </div>

                      <div>
                        <label className="block text-white/70 text-sm mb-1">Capacity</label>
                        <input
                          type="number"
                          value={classForm.capacity}
                          onChange={(e) => setClassForm({ ...classForm, capacity: parseInt(e.target.value) || 20 })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                          min={1}
                          max={1000}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/70 text-sm mb-1">Location Type</label>
                        <select
                          value={classForm.locationType}
                          onChange={(e) => setClassForm({ ...classForm, locationType: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        >
                          <option value="virtual">Virtual</option>
                          <option value="in_person">In Person</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-white/70 text-sm mb-1">Price (credits)</label>
                        <input
                          type="number"
                          value={classForm.creditsPerStudent}
                          onChange={(e) => setClassForm({ ...classForm, creditsPerStudent: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                          min={0}
                        />
                      </div>
                    </div>

                    <GlassButton
                      onClick={handleCreateClass}
                      disabled={!classForm.title || !classForm.startAt}
                      className="w-full"
                    >
                      Create Class
                    </GlassButton>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trainer Detail Modal */}
        <AnimatePresence>
          {selectedTrainer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedTrainer(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Trainer Profile</h2>
                    <button onClick={() => setSelectedTrainer(null)} className="text-white/50 hover:text-white">
                      <Icons.X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-4xl mx-auto mb-4">
                      {selectedTrainer.displayName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-2xl font-bold text-white">{selectedTrainer.displayName}</h3>
                      {selectedTrainer.verified && (
                        <Icons.Badge className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    {selectedTrainer.avgRating && (
                      <div className="flex items-center justify-center gap-1 text-amber-400 mt-2">
                        <Icons.Star className="w-4 h-4" />
                        <span>{selectedTrainer.avgRating.toFixed(1)}</span>
                        <span className="text-white/50">({selectedTrainer.totalReviews || 0} reviews)</span>
                      </div>
                    )}
                  </div>

                  {selectedTrainer.bio && (
                    <div className="mb-6">
                      <h4 className="text-white/70 text-sm mb-2">About</h4>
                      <p className="text-white/80">{selectedTrainer.bio}</p>
                    </div>
                  )}

                  {selectedTrainer.specialties?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-white/70 text-sm mb-2">Specialties</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrainer.specialties.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-sm">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTrainer.certifications?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-white/70 text-sm mb-2">Certifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrainer.certifications.map((c, i) => (
                          <span key={i} className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-sm flex items-center gap-1">
                            <Icons.Badge className="w-3 h-3" />
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <GlassCard className="p-4 text-center">
                      <div className="text-2xl font-bold text-white">{selectedTrainer.totalClasses || 0}</div>
                      <div className="text-white/50 text-sm">Classes Taught</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                      <div className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1">
                        <Icons.Coins className="w-5 h-5" />
                        {selectedTrainer.perClassRateCredits || 0}
                      </div>
                      <div className="text-white/50 text-sm">Per Class</div>
                    </GlassCard>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassSurface>
  );
}
