import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>,
  Calendar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
  Star: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Location: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Verified: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
};

const DIFFICULTY_CONFIG = {
  beginner: { label: 'Beginner', color: 'bg-green-500/20 text-green-400' },
  intermediate: { label: 'Intermediate', color: 'bg-yellow-500/20 text-yellow-400' },
  advanced: { label: 'Advanced', color: 'bg-red-500/20 text-red-400' },
  all: { label: 'All Levels', color: 'bg-blue-500/20 text-blue-400' },
};

const LOCATION_TYPE_CONFIG = {
  in_person: { label: 'In Person', icon: '🏋️' },
  virtual: { label: 'Virtual', icon: '💻' },
  hybrid: { label: 'Hybrid', icon: '🔄' },
};

const formatDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

export default function TrainerDashboard() {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

  // Form states
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    specialties: '',
    hourlyRateCredits: 100,
    perClassRateCredits: 50,
  });

  const [classForm, setClassForm] = useState({
    title: '',
    description: '',
    category: 'strength',
    difficulty: 'all',
    startAt: '',
    durationMinutes: 60,
    locationType: 'in_person',
    locationDetails: '',
    capacity: 20,
    creditsPerStudent: 50,
    trainerWagePerStudent: 40,
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [profileRes, classesRes] = await Promise.all([
        fetch('/api/trainers/me', { headers }),
        fetch('/api/trainers/me/classes', { headers }),
      ]);

      const [profileData, classesData] = await Promise.all([
        profileRes.json(),
        classesRes.json(),
      ]);

      setProfile(profileData.data);
      setClasses(classesData.data || []);

      if (profileData.data) {
        setProfileForm({
          displayName: profileData.data.displayName || profileData.data.display_name || '',
          bio: profileData.data.bio || '',
          specialties: (profileData.data.specialties || []).join(', '),
          hourlyRateCredits: profileData.data.hourlyRateCredits || profileData.data.hourly_rate_credits || 100,
          perClassRateCredits: profileData.data.perClassRateCredits || profileData.data.per_class_rate_credits || 50,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/trainers/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: profileForm.displayName,
          bio: profileForm.bio,
          specialties: profileForm.specialties.split(',').map(s => s.trim()).filter(Boolean),
          hourlyRateCredits: profileForm.hourlyRateCredits,
          perClassRateCredits: profileForm.perClassRateCredits,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setProfile(data.data);
        setShowCreateProfile(false);
        showSnackbar('Profile saved!', 'success');
      }
    } catch (_err) {
      showSnackbar('Failed to save profile', 'error');
    }
  };

  const createClass = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...classForm,
          startAt: new Date(classForm.startAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.data) {
        setShowCreateClass(false);
        setClassForm({
          title: '',
          description: '',
          category: 'strength',
          difficulty: 'all',
          startAt: '',
          durationMinutes: 60,
          locationType: 'in_person',
          locationDetails: '',
          capacity: 20,
          creditsPerStudent: 50,
          trainerWagePerStudent: 40,
        });
        showSnackbar('Class created!', 'success');
        fetchData();
      } else {
        showSnackbar(data.error?.message || 'Failed to create class', 'error');
      }
    } catch (_err) {
      showSnackbar('Failed to create class', 'error');
    }
  };

  const openAttendanceModal = async (classData) => {
    setSelectedClass(classData);
    try {
      const res = await fetch(`/api/classes/${classData.id}/enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEnrollments(data.data || []);
      setAttendanceData(
        (data.data || []).reduce((acc, e) => ({ ...acc, [e.userId || e.user_id]: { attended: false, rating: 5 } }), {})
      );
      setShowAttendanceModal(true);
    } catch (_err) {
      showSnackbar('Failed to load enrollments', 'error');
    }
  };

  const submitAttendance = async () => {
    try {
      const attendees = Object.entries(attendanceData).map(([userId, data]) => ({
        userId,
        attended: data.attended,
        rating: data.rating,
      }));

      const res = await fetch(`/api/classes/${selectedClass.id}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ attendees }),
      });
      const data = await res.json();
      if (data.data) {
        setShowAttendanceModal(false);
        showSnackbar(`Attendance marked! Earned ${data.data.wageEarned} credits`, 'success');
        fetchData();
      }
    } catch (_err) {
      showSnackbar('Failed to mark attendance', 'error');
    }
  };

  const cancelClass = async (classId) => {
    if (!confirm('Are you sure you want to cancel this class? All enrolled students will be refunded.')) return;

    try {
      const res = await fetch(`/api/classes/${classId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Cancelled by trainer' }),
      });
      const data = await res.json();
      if (data.data?.success) {
        showSnackbar('Class cancelled', 'success');
        fetchData();
      }
    } catch (_err) {
      showSnackbar('Failed to cancel class', 'error');
    }
  };

  const showSnackbar = (message, type) => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
  };

  const upcomingClasses = classes.filter(c => c.status === 'scheduled' && new Date(c.startAt || c.start_at) > new Date());
  const pastClasses = classes.filter(c => c.status === 'completed');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold ml-3">Trainer Dashboard</h1>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="text-8xl mb-6">🏋️</div>
          <h2 className="text-2xl font-bold mb-4">Become a Trainer</h2>
          <p className="text-gray-400 mb-8">
            Create your trainer profile to start hosting fitness classes and earn credits for your expertise.
          </p>
          <button
            onClick={() => setShowCreateProfile(true)}
            className="px-8 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold transition-all"
          >
            Create Trainer Profile
          </button>
        </main>

        {/* Create Profile Modal */}
        <ProfileModal
          show={showCreateProfile}
          onClose={() => setShowCreateProfile(false)}
          form={profileForm}
          setForm={setProfileForm}
          onSubmit={createOrUpdateProfile}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Trainer Dashboard</h1>
          </div>
          <button
            onClick={() => setShowCreateClass(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl transition-all"
          >
            <Icons.Plus />
            <span className="hidden sm:inline">New Class</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl">
                🏋️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{profile.displayName || profile.display_name}</h2>
                  {profile.verified && <Icons.Verified className="text-blue-400" />}
                </div>
                <p className="text-white/70">{profile.bio || 'Fitness Trainer'}</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateProfile(true)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-all"
            >
              Edit
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{profile.totalClassesTaught || profile.total_classes_taught || 0}</div>
              <div className="text-xs text-white/70">Classes</div>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{profile.totalStudentsTrained || profile.total_students_trained || 0}</div>
              <div className="text-xs text-white/70">Students</div>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{(profile.totalCreditsEarned || profile.total_credits_earned || 0).toLocaleString()}</div>
              <div className="text-xs text-white/70">Credits</div>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Icons.Star className="w-4 h-4 text-yellow-400" />
                <span className="text-2xl font-bold">{(profile.ratingAvg || profile.rating_avg || 0).toFixed(1)}</span>
              </div>
              <div className="text-xs text-white/70">Rating</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
          {['overview', 'upcoming', 'past'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all capitalize',
                activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {tab}
              {tab === 'upcoming' && upcomingClasses.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-violet-600 rounded-full">{upcomingClasses.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowCreateClass(true)}
                className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center">
                  <Icons.Plus className="text-violet-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Create Class</div>
                  <div className="text-sm text-gray-400">Schedule a new session</div>
                </div>
              </button>
              <Link
                to="/classes"
                className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Icons.Calendar className="text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Browse Classes</div>
                  <div className="text-sm text-gray-400">View all classes</div>
                </div>
              </Link>
            </div>

            {/* Next Upcoming Class */}
            {upcomingClasses.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Next Up</h3>
                <ClassCard
                  classData={upcomingClasses[0]}
                  onMarkAttendance={openAttendanceModal}
                  onCancel={cancelClass}
                />
              </div>
            )}

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Classes</h3>
              {pastClasses.length === 0 ? (
                <div className="bg-white/5 rounded-xl p-6 text-center text-gray-400">
                  No completed classes yet
                </div>
              ) : (
                <div className="space-y-3">
                  {pastClasses.slice(0, 3).map(classData => (
                    <ClassCard key={classData.id} classData={classData} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            {upcomingClasses.length === 0 ? (
              <div className="bg-white/5 rounded-xl p-8 text-center">
                <Icons.Calendar className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 mb-4">No upcoming classes</p>
                <button
                  onClick={() => setShowCreateClass(true)}
                  className="px-6 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl transition-all"
                >
                  Create a Class
                </button>
              </div>
            ) : (
              upcomingClasses.map(classData => (
                <ClassCard
                  key={classData.id}
                  classData={classData}
                  onMarkAttendance={openAttendanceModal}
                  onCancel={cancelClass}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'past' && (
          <div className="space-y-4">
            {pastClasses.length === 0 ? (
              <div className="bg-white/5 rounded-xl p-8 text-center text-gray-400">
                No completed classes yet
              </div>
            ) : (
              pastClasses.map(classData => (
                <ClassCard key={classData.id} classData={classData} />
              ))
            )}
          </div>
        )}
      </main>

      {/* Profile Modal */}
      <ProfileModal
        show={showCreateProfile}
        onClose={() => setShowCreateProfile(false)}
        form={profileForm}
        setForm={setProfileForm}
        onSubmit={createOrUpdateProfile}
      />

      {/* Create Class Modal */}
      <AnimatePresence>
        {showCreateClass && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowCreateClass(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg my-8"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-6">Create New Class</h2>
                <form onSubmit={createClass} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Title</label>
                    <input
                      type="text"
                      value={classForm.title}
                      onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                    <textarea
                      value={classForm.description}
                      onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none h-20 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Category</label>
                      <select
                        value={classForm.category}
                        onChange={(e) => setClassForm({ ...classForm, category: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                      >
                        <option value="strength">Strength</option>
                        <option value="cardio">Cardio</option>
                        <option value="hiit">HIIT</option>
                        <option value="yoga">Yoga</option>
                        <option value="mobility">Mobility</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Difficulty</label>
                      <select
                        value={classForm.difficulty}
                        onChange={(e) => setClassForm({ ...classForm, difficulty: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                      >
                        {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                      <input
                        type="datetime-local"
                        value={classForm.startAt}
                        onChange={(e) => setClassForm({ ...classForm, startAt: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Duration (min)</label>
                      <input
                        type="number"
                        value={classForm.durationMinutes}
                        onChange={(e) => setClassForm({ ...classForm, durationMinutes: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                        min="5"
                        max="480"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Location Type</label>
                      <select
                        value={classForm.locationType}
                        onChange={(e) => setClassForm({ ...classForm, locationType: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                      >
                        {Object.entries(LOCATION_TYPE_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>{config.icon} {config.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Capacity</label>
                      <input
                        type="number"
                        value={classForm.capacity}
                        onChange={(e) => setClassForm({ ...classForm, capacity: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                        min="1"
                        max="1000"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Location Details</label>
                    <input
                      type="text"
                      value={classForm.locationDetails}
                      onChange={(e) => setClassForm({ ...classForm, locationDetails: e.target.value })}
                      placeholder="Address or virtual link"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Price per Student</label>
                      <input
                        type="number"
                        value={classForm.creditsPerStudent}
                        onChange={(e) => setClassForm({ ...classForm, creditsPerStudent: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Your Wage per Student</label>
                      <input
                        type="number"
                        value={classForm.trainerWagePerStudent}
                        onChange={(e) => setClassForm({ ...classForm, trainerWagePerStudent: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateClass(false)}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold transition-all"
                    >
                      Create Class
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attendance Modal */}
      <AnimatePresence>
        {showAttendanceModal && selectedClass && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAttendanceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-2">Mark Attendance</h2>
                <p className="text-gray-400 text-sm mb-6">{selectedClass.title}</p>

                {enrollments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No students enrolled
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrollments.map(enrollment => (
                      <div
                        key={enrollment.userId || enrollment.user_id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setAttendanceData(prev => ({
                              ...prev,
                              [enrollment.userId || enrollment.user_id]: {
                                ...prev[enrollment.userId || enrollment.user_id],
                                attended: !prev[enrollment.userId || enrollment.user_id]?.attended
                              }
                            }))}
                            className={clsx(
                              'w-6 h-6 rounded border-2 flex items-center justify-center transition-all',
                              attendanceData[enrollment.userId || enrollment.user_id]?.attended
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-600'
                            )}
                          >
                            {attendanceData[enrollment.userId || enrollment.user_id]?.attended && <Icons.Check />}
                          </button>
                          <span>Student {(enrollment.userId || enrollment.user_id).slice(-4)}</span>
                        </div>
                        {attendanceData[enrollment.userId || enrollment.user_id]?.attended && (
                          <select
                            value={attendanceData[enrollment.userId || enrollment.user_id]?.rating || 5}
                            onChange={(e) => setAttendanceData(prev => ({
                              ...prev,
                              [enrollment.userId || enrollment.user_id]: {
                                ...prev[enrollment.userId || enrollment.user_id],
                                rating: parseInt(e.target.value)
                              }
                            }))}
                            className="px-2 py-1 bg-white/10 rounded text-sm"
                          >
                            {[1, 2, 3, 4, 5].map(r => (
                              <option key={r} value={r}>{r} star{r > 1 ? 's' : ''}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAttendanceModal(false)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitAttendance}
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold transition-all"
                  >
                    Submit Attendance
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snackbar */}
      <AnimatePresence>
        {snackbar.show && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={clsx(
              'fixed bottom-4 left-4 right-4 mx-auto max-w-md px-4 py-3 rounded-xl text-center font-medium z-50',
              snackbar.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            )}
          >
            {snackbar.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileModal({ show, onClose, form, setForm, onSubmit }) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md"
        >
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Trainer Profile</h2>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none h-20 resize-none"
                  placeholder="Tell students about yourself"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Specialties (comma separated)</label>
                <input
                  type="text"
                  value={form.specialties}
                  onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                  placeholder="Strength training, HIIT, Yoga"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Hourly Rate</label>
                  <input
                    type="number"
                    value={form.hourlyRateCredits}
                    onChange={(e) => setForm({ ...form, hourlyRateCredits: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Per Class Rate</label>
                  <input
                    type="number"
                    value={form.perClassRateCredits}
                    onChange={(e) => setForm({ ...form, perClassRateCredits: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold transition-all"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ClassCard({ classData, onMarkAttendance, onCancel }) {
  const startAt = classData.startAt || classData.start_at;
  const enrolledCount = classData.enrolledCount || classData.enrolled_count || 0;
  const locationType = classData.locationType || classData.location_type;
  const creditsPerStudent = classData.creditsPerStudent || classData.credits_per_student;
  const trainerWagePerStudent = classData.trainerWagePerStudent || classData.trainer_wage_per_student;
  const difficulty = DIFFICULTY_CONFIG[classData.difficulty] || DIFFICULTY_CONFIG.all;
  const location = LOCATION_TYPE_CONFIG[locationType] || LOCATION_TYPE_CONFIG.in_person;
  const isUpcoming = classData.status === 'scheduled' && new Date(startAt) > new Date();

  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold mb-1">{classData.title}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Icons.Calendar className="w-4 h-4" />
            <span>{formatDate(startAt)}</span>
          </div>
        </div>
        <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', difficulty.color)}>
          {difficulty.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg text-sm">
          <Icons.Users className="w-4 h-4" />
          {enrolledCount}/{classData.capacity}
        </span>
        <span className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg text-sm">
          <Icons.Clock className="w-4 h-4" />
          {classData.durationMinutes || classData.duration_minutes} min
        </span>
        <span className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg text-sm">
          {location.icon} {location.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-gray-400">Price: {creditsPerStudent} credits</span>
        <span className="text-gray-400">Wage: {trainerWagePerStudent}/student</span>
      </div>

      {isUpcoming && onMarkAttendance && (
        <div className="flex gap-2">
          <button
            onClick={() => onMarkAttendance(classData)}
            className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition-all"
          >
            Mark Attendance
          </button>
          <button
            onClick={() => onCancel && onCancel(classData.id)}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      )}

      {classData.status === 'completed' && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <Icons.Check className="w-4 h-4" />
          Completed
        </div>
      )}
    </div>
  );
}
