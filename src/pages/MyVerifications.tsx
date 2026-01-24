/**
 * My Verifications Page
 *
 * View and manage achievement verifications:
 * - My Submissions: verification requests I've submitted
 * - Witness Requests: requests from others for me to witness
 *
 * Uses GraphQL for all API operations.
 */

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '../store/authStore';
import {
  MY_VERIFICATIONS_QUERY,
  MY_WITNESS_REQUESTS_QUERY,
  CANCEL_VERIFICATION_MUTATION,
} from '../graphql';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  X: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  Eye: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Video: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>,
};

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  bronze: { label: 'Bronze', color: 'bg-amber-700/20 text-amber-500 border-amber-700/30' },
  silver: { label: 'Silver', color: 'bg-gray-400/20 text-gray-400 border-gray-400/30' },
  gold: { label: 'Gold', color: 'bg-amber-400/20 text-amber-400 border-amber-400/30' },
  platinum: { label: 'Platinum', color: 'bg-cyan-400/20 text-cyan-400 border-cyan-400/30' },
  diamond: { label: 'Diamond', color: 'bg-violet-400/20 text-violet-400 border-violet-400/30' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.FC }> = {
  pending_witness: { label: 'Awaiting Witness', color: 'bg-yellow-500/20 text-yellow-400', icon: Icons.Clock },
  verified: { label: 'Verified', color: 'bg-green-500/20 text-green-400', icon: Icons.Check },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: Icons.X },
  expired: { label: 'Expired', color: 'bg-gray-500/20 text-gray-400', icon: Icons.Clock },
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatDaysRemaining = (expiresAt: string) => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Expired';
  if (days === 1) return '1 day left';
  return `${days} days left`;
};

// Types
interface WitnessInfo {
  id: string;
  witnessUserId: string;
  witnessUsername?: string;
  witnessDisplayName?: string;
  witnessAvatarUrl?: string;
  attestationText?: string;
  relationship?: string;
  locationDescription?: string;
  status: string;
  isPublic: boolean;
  requestedAt: string;
  respondedAt?: string;
}

interface AchievementVerification {
  id: string;
  userId: string;
  achievementId: string;
  achievementKey?: string;
  achievementName?: string;
  achievementTier?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  videoDurationSeconds?: number;
  status: string;
  notes?: string;
  rejectionReason?: string;
  submittedAt: string;
  verifiedAt?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  witness?: WitnessInfo;
}

export default function MyVerifications() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'my' | 'witness'>('my');
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Redirect if not logged in
  React.useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Fetch my verifications via GraphQL
  const { data: verificationsData, loading: verificationsLoading, refetch: refetchVerifications } = useQuery<{
    myVerifications: { verifications: AchievementVerification[]; total: number };
  }>(MY_VERIFICATIONS_QUERY, {
    skip: !token,
    fetchPolicy: 'cache-and-network',
  });

  // Fetch witness requests via GraphQL
  const { data: witnessData, loading: witnessLoading } = useQuery<{
    myWitnessRequests: { verifications: AchievementVerification[]; total: number };
  }>(MY_WITNESS_REQUESTS_QUERY, {
    skip: !token,
    fetchPolicy: 'cache-and-network',
  });

  // Cancel verification mutation
  const [cancelVerification] = useMutation(CANCEL_VERIFICATION_MUTATION, {
    onCompleted: () => {
      refetchVerifications();
      setCancelling(null);
    },
    onError: (err) => {
      console.error('Failed to cancel:', err);
      setCancelling(null);
    },
  });

  const verifications = useMemo(() =>
    verificationsData?.myVerifications?.verifications || [],
    [verificationsData]
  );

  const witnessRequests = useMemo(() =>
    witnessData?.myWitnessRequests?.verifications || [],
    [witnessData]
  );

  const handleCancel = async (verificationId: string) => {
    if (!confirm('Are you sure you want to cancel this verification request?')) return;

    setCancelling(verificationId);
    cancelVerification({ variables: { verificationId } });
  };

  const loading = verificationsLoading && witnessLoading;

  if (loading && verifications.length === 0 && witnessRequests.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const pendingWitnessCount = witnessRequests.filter((r) => r.witness?.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/achievements" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Verifications</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('my')}
            className={clsx(
              'flex-1 py-3 px-4 rounded-xl font-medium transition-colors',
              activeTab === 'my'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            )}
          >
            My Submissions
          </button>
          <button
            onClick={() => setActiveTab('witness')}
            className={clsx(
              'flex-1 py-3 px-4 rounded-xl font-medium transition-colors relative',
              activeTab === 'witness'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            )}
          >
            Witness Requests
            {pendingWitnessCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                {pendingWitnessCount}
              </span>
            )}
          </button>
        </div>

        {/* My Submissions */}
        {activeTab === 'my' && (
          <div className="space-y-4">
            {verifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <Icons.Shield />
                </div>
                <p className="text-gray-400 mb-4">No verification submissions yet</p>
                <Link
                  to="/achievements"
                  className="inline-block px-6 py-3 bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors"
                >
                  Browse Achievements
                </Link>
              </div>
            ) : (
              verifications.map((verification) => {
                const tierConfig = TIER_CONFIG[verification.achievementTier || 'bronze'] || TIER_CONFIG.bronze;
                const statusConfig = STATUS_CONFIG[verification.status] || STATUS_CONFIG.pending_witness;
                const StatusIcon = statusConfig.icon;

                return (
                  <motion.div
                    key={verification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1a1a2e] rounded-xl p-4 border border-white/5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className={clsx('text-xs px-2 py-0.5 rounded border', tierConfig.color)}>
                          {TIER_CONFIG[verification.achievementTier || 'bronze']?.label || 'Bronze'}
                        </span>
                        <h3 className="text-lg font-semibold mt-1">{verification.achievementName}</h3>
                      </div>
                      <span className={clsx('flex items-center gap-1 text-xs px-2 py-1 rounded', statusConfig.color)}>
                        <StatusIcon />
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Witness Info */}
                    {verification.witness && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                        <Icons.User />
                        <span>
                          Witness: @{verification.witness.witnessUsername || 'Unknown'}
                          {verification.witness.status === 'pending' && (
                            <span className="text-yellow-400 ml-2">• Waiting for response</span>
                          )}
                          {verification.witness.status === 'confirmed' && (
                            <span className="text-green-400 ml-2">• Confirmed</span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Video Preview */}
                    {verification.videoUrl && (
                      <div className="mb-3">
                        <video
                          src={verification.videoUrl}
                          className="w-full max-h-48 rounded-lg bg-black"
                          controls
                        />
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Submitted {formatDate(verification.submittedAt)}</span>
                      {verification.status === 'pending_witness' && (
                        <span className="text-yellow-400">
                          {formatDaysRemaining(verification.expiresAt)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {verification.status === 'pending_witness' && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <button
                          onClick={() => handleCancel(verification.id)}
                          disabled={cancelling === verification.id}
                          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
                        >
                          {cancelling === verification.id ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Icons.Trash />
                          )}
                          Cancel Request
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* Witness Requests */}
        {activeTab === 'witness' && (
          <div className="space-y-4">
            {witnessRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <Icons.Eye />
                </div>
                <p className="text-gray-400">No witness requests</p>
                <p className="text-sm text-gray-500 mt-1">
                  When someone asks you to verify their achievement, it will appear here.
                </p>
              </div>
            ) : (
              witnessRequests.map((request) => {
                const tierConfig = TIER_CONFIG[request.achievementTier || 'bronze'] || TIER_CONFIG.bronze;
                const isPending = request.witness?.status === 'pending';

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx(
                      'bg-[#1a1a2e] rounded-xl p-4 border',
                      isPending ? 'border-violet-500/30' : 'border-white/5'
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className={clsx('text-xs px-2 py-0.5 rounded border', tierConfig.color)}>
                          {TIER_CONFIG[request.achievementTier || 'bronze']?.label || 'Bronze'}
                        </span>
                        <h3 className="text-lg font-semibold mt-1">{request.achievementName}</h3>
                      </div>
                      {isPending && (
                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                          Action Required
                        </span>
                      )}
                    </div>

                    {/* Requester Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                        {request.avatarUrl ? (
                          <img src={request.avatarUrl} alt="" className="w-full h-full rounded-full" />
                        ) : (
                          <Icons.User />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{request.displayName || request.username}</p>
                        <p className="text-sm text-gray-400">@{request.username}</p>
                      </div>
                    </div>

                    {/* Video */}
                    {request.videoUrl && (
                      <div className="mb-3">
                        <video
                          src={request.videoUrl}
                          className="w-full max-h-48 rounded-lg bg-black"
                          controls
                        />
                      </div>
                    )}

                    {/* Notes */}
                    {request.notes && (
                      <p className="text-sm text-gray-400 mb-3 bg-white/5 rounded-lg p-3">
                        &quot;{request.notes}&quot;
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>Requested {formatDate(request.submittedAt)}</span>
                      {isPending && (
                        <span className="text-yellow-400">
                          {formatDaysRemaining(request.expiresAt)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {isPending && (
                      <div className="flex gap-3">
                        <Link
                          to={`/verifications/${request.id}/witness`}
                          className="flex-1 py-3 bg-violet-600 text-center rounded-xl font-medium hover:bg-violet-500 transition-colors"
                        >
                          Review & Respond
                        </Link>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
