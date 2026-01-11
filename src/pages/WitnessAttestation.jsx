import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Check: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  X: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  AlertTriangle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
};

const TIER_CONFIG = {
  bronze: { label: 'Bronze', color: 'from-amber-700 to-amber-900', text: 'text-amber-500' },
  silver: { label: 'Silver', color: 'from-gray-400 to-gray-600', text: 'text-gray-400' },
  gold: { label: 'Gold', color: 'from-amber-400 to-yellow-600', text: 'text-amber-400' },
  platinum: { label: 'Platinum', color: 'from-cyan-400 to-blue-600', text: 'text-cyan-400' },
  diamond: { label: 'Diamond', color: 'from-violet-400 to-purple-600', text: 'text-violet-400' },
};

export default function WitnessAttestation() {
  const { verificationId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Form state
  const [attestationText, setAttestationText] = useState('');
  const [relationship, setRelationship] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    fetchVerification();
  }, [verificationId]);

  const fetchVerification = async () => {
    try {
      const res = await fetch(`/api/verifications/${verificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Verification not found');
      }

      const data = await res.json();
      setVerification(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (confirm) => {
    if (confirm && !attestationText.trim()) {
      setError('Please provide attestation text when confirming');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/verifications/${verificationId}/witness`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirm,
          attestation_text: attestationText,
          relationship,
          location_description: locationDescription,
          is_public: isPublic,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit attestation');
      }

      setResult({
        confirmed: confirm,
        message: data.message,
      });
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

  if (result) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-8 max-w-md"
        >
          <div
            className={clsx(
              'w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center',
              result.confirmed ? 'bg-green-500/20' : 'bg-red-500/20'
            )}
          >
            {result.confirmed ? (
              <Icons.Check />
            ) : (
              <Icons.X />
            )}
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            {result.confirmed ? 'Achievement Verified!' : 'Request Declined'}
          </h2>
          <p className="text-gray-400 mb-6">{result.message}</p>
          <Link
            to="/achievements/my-verifications"
            className="inline-block px-6 py-3 bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors"
          >
            Back to Verifications
          </Link>
        </motion.div>
      </div>
    );
  }

  if (error && !verification) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <Icons.AlertTriangle />
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <Link to="/achievements/my-verifications" className="text-violet-400 hover:underline">
            Back to Verifications
          </Link>
        </div>
      </div>
    );
  }

  const tierConfig = TIER_CONFIG[verification?.achievementTier] || TIER_CONFIG.bronze;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/achievements/my-verifications" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Witness Request</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Achievement Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx('rounded-2xl p-6 mb-6 bg-gradient-to-br', tierConfig.color)}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
              <Icons.Shield />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                {tierConfig.label} Tier
              </span>
              <h2 className="text-2xl font-bold">{verification?.achievementName}</h2>
            </div>
          </div>
        </motion.div>

        {/* Requester Info */}
        <div className="bg-[#1a1a2e] rounded-xl p-4 mb-6 border border-white/5">
          <p className="text-sm text-gray-400 mb-3">Submitted by</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
              {verification?.avatarUrl ? (
                <img src={verification.avatarUrl} alt="" className="w-full h-full rounded-full" />
              ) : (
                <Icons.User />
              )}
            </div>
            <div>
              <p className="font-medium text-lg">{verification?.displayName || verification?.username}</p>
              <p className="text-gray-400">@{verification?.username}</p>
            </div>
          </div>
        </div>

        {/* Video */}
        {verification?.videoUrl && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2">Video Proof</p>
            <video
              src={verification.videoUrl}
              className="w-full rounded-xl bg-black"
              controls
            />
          </div>
        )}

        {/* Notes */}
        {verification?.notes && (
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-400 mb-2">Their Description</p>
            <p className="text-white">"{verification.notes}"</p>
          </div>
        )}

        {/* Important Notice */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Icons.AlertTriangle />
            <div>
              <p className="font-medium text-yellow-400">Important</p>
              <p className="text-sm text-yellow-400/80 mt-1">
                Only confirm if you have personally witnessed this person perform this achievement in real life.
                Your name will be publicly associated with this verification.
              </p>
            </div>
          </div>
        </div>

        {/* Attestation Form */}
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Attestation <span className="text-red-400">*</span>
            </label>
            <textarea
              value={attestationText}
              onChange={(e) => setAttestationText(e.target.value)}
              placeholder="I confirm that I personally witnessed [Name] perform this achievement on [date] at [location]..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{attestationText.length}/500 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Relationship (optional)
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="">Select...</option>
              <option value="friend">Friend</option>
              <option value="gym_buddy">Gym Buddy</option>
              <option value="training_partner">Training Partner</option>
              <option value="coach">Coach/Trainer</option>
              <option value="family">Family Member</option>
              <option value="coworker">Coworker</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Where did you witness this? (optional)
            </label>
            <input
              type="text"
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              placeholder="e.g., Gold's Gym Downtown, Central Park..."
              maxLength={200}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-5 h-5 rounded bg-white/5 border-white/10 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-300">
              Show my name publicly as the witness for this achievement
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex-1 py-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Decline'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting || !attestationText.trim()}
              className={clsx(
                'flex-1 py-4 rounded-xl font-semibold transition-colors',
                submitting || !attestationText.trim()
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500 text-white'
              )}
            >
              {submitting ? 'Processing...' : 'Confirm & Verify'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
