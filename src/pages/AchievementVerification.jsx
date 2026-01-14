import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Upload: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>,
  Video: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  X: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  AlertCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
};

const TIER_CONFIG = {
  bronze: { label: 'Bronze', color: 'from-amber-700 to-amber-900', text: 'text-amber-500' },
  silver: { label: 'Silver', color: 'from-gray-400 to-gray-600', text: 'text-gray-400' },
  gold: { label: 'Gold', color: 'from-amber-400 to-yellow-600', text: 'text-amber-400' },
  platinum: { label: 'Platinum', color: 'from-cyan-400 to-blue-600', text: 'text-cyan-400' },
  diamond: { label: 'Diamond', color: 'from-violet-400 to-purple-600', text: 'text-violet-400' },
};

// Date formatters available for future use
const _formatDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const _formatDaysRemaining = (expiresAt) => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Expired';
  if (days === 1) return '1 day left';
  return `${days} days left`;
};

export default function AchievementVerification() {
  const { achievementId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const fileInputRef = useRef(null);

  const [achievement, setAchievement] = useState(null);
  const [canVerify, setCanVerify] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [notes, setNotes] = useState('');
  const [witnessSearch, setWitnessSearch] = useState('');
  const [witnessResults, setWitnessResults] = useState([]);
  const [selectedWitness, setSelectedWitness] = useState(null);
  const [searchingWitness, setSearchingWitness] = useState(false);

  useEffect(() => {
    fetchAchievementData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievementId]);

  const fetchAchievementData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [achRes, canVerifyRes] = await Promise.all([
        fetch(`/api/achievements/definitions/${achievementId}`, { headers }),
        fetch(`/api/achievements/${achievementId}/can-verify`, { headers }),
      ]);

      if (!achRes.ok) {
        throw new Error('Achievement not found');
      }

      const achData = await achRes.json();
      const canVerifyData = await canVerifyRes.json();

      setAchievement(achData.data);
      setCanVerify(canVerifyData.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file');
        return;
      }

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        setError('Video must be less than 50MB');
        return;
      }

      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const searchWitnesses = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setWitnessResults([]);
      return;
    }

    setSearchingWitness(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWitnessResults(data.data || []);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setSearchingWitness(false);
    }
  }, [token]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchWitnesses(witnessSearch);
    }, 300);
    return () => clearTimeout(debounce);
  }, [witnessSearch, searchWitnesses]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedWitness) {
      setError('Please select a witness');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('witness_user_id', selectedWitness.id);
      if (notes) formData.append('notes', notes);
      if (videoFile) formData.append('video', videoFile);

      const res = await fetch(`/api/achievements/${achievementId}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit verification');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/achievements/my-verifications');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-8"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <Icons.Check />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Verification Submitted!</h2>
          <p className="text-gray-400">Your witness will be notified to confirm your achievement.</p>
        </motion.div>
      </div>
    );
  }

  const tierConfig = TIER_CONFIG[achievement?.tier] || TIER_CONFIG.bronze;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/achievements" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Verify Achievement</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Achievement Info */}
        {achievement && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              'rounded-2xl p-6 mb-6 bg-gradient-to-br',
              tierConfig.color
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-3xl">
                <Icons.Shield />
              </div>
              <div>
                <span className={clsx('text-xs font-semibold uppercase tracking-wider opacity-80')}>
                  {tierConfig.label} Tier
                </span>
                <h2 className="text-2xl font-bold">{achievement.name}</h2>
                <p className="text-white/70 text-sm">{achievement.description}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-white/10 rounded-full">{achievement.points} pts</span>
              <span className="px-3 py-1 bg-white/10 rounded-full capitalize">{achievement.rarity}</span>
            </div>
          </motion.div>
        )}

        {/* Can't Verify Message */}
        {canVerify && !canVerify.canSubmit && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <Icons.AlertCircle />
              <p className="text-red-400">{canVerify.reason}</p>
            </div>
          </div>
        )}

        {/* Verification Form */}
        {canVerify?.canSubmit && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Video Proof (recommended)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  videoFile
                    ? 'border-violet-500/50 bg-violet-500/10'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                )}
              >
                {videoPreview ? (
                  <div className="space-y-4">
                    <video
                      src={videoPreview}
                      className="max-h-48 mx-auto rounded-lg"
                      controls
                    />
                    <p className="text-sm text-gray-400">{videoFile.name}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoFile(null);
                        setVideoPreview(null);
                      }}
                      className="text-red-400 text-sm hover:text-red-300"
                    >
                      Remove video
                    </button>
                  </div>
                ) : (
                  <>
                    <Icons.Upload />
                    <p className="mt-2 text-sm text-gray-400">
                      Click to upload a video (15-60 seconds)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">MP4, MOV, or WebM up to 50MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe when and where you achieved this..."
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{notes.length}/500 characters</p>
            </div>

            {/* Witness Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Witness <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Choose someone who has seen you perform this feat in person. They must confirm your achievement.
              </p>

              {selectedWitness ? (
                <div className="flex items-center justify-between p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                      {selectedWitness.avatarUrl ? (
                        <img src={selectedWitness.avatarUrl} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        <Icons.User />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{selectedWitness.displayName || selectedWitness.username}</p>
                      <p className="text-sm text-gray-400">@{selectedWitness.username}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedWitness(null)}
                    className="p-2 hover:bg-white/10 rounded-lg"
                  >
                    <Icons.X />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <Icons.Search />
                  </div>
                  <input
                    type="text"
                    value={witnessSearch}
                    onChange={(e) => setWitnessSearch(e.target.value)}
                    placeholder="Search by username..."
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />

                  {/* Search Results */}
                  {witnessResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden shadow-xl z-10">
                      {witnessResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedWitness(user);
                            setWitnessSearch('');
                            setWitnessResults([]);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full" />
                            ) : (
                              <Icons.User />
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium">{user.displayName || user.username}</p>
                            <p className="text-xs text-gray-500">@{user.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchingWitness && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-[#1a1a2e] border border-white/10 rounded-xl text-center">
                      <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedWitness}
              className={clsx(
                'w-full py-4 rounded-xl font-semibold text-lg transition-all',
                submitting || !selectedWitness
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500'
              )}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </span>
              ) : (
                'Submit for Verification'
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Your witness has 30 days to confirm. If they don&apos;t respond, you can submit again with a different witness.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
