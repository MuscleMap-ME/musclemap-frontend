/**
 * Admin Exercise Images Review
 *
 * Admin page for reviewing and approving/rejecting community-submitted exercise images.
 * Located at /empire/exercise-images
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  X,
  Eye,
  AlertTriangle,
  Shield,
  Image as ImageIcon,
  User,
  Calendar,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import GlassSurface from '../components/glass/GlassSurface';
import { useAuth } from '../store/authStore';

interface ImageSubmission {
  id: string;
  exerciseId: string;
  exerciseName: string;
  userId: string;
  username: string;
  thumbnailUrl: string;
  processedUrl: string;
  originalUrl: string;
  nsfwScore: number;
  exerciseMatchScore: number;
  aiValidationPassed: boolean;
  aiValidationNotes: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  totalToday: number;
  avgReviewTime: number;
}

const REJECTION_REASONS = [
  { value: 'nsfw', label: 'NSFW/Inappropriate content' },
  { value: 'wrong_exercise', label: 'Wrong exercise shown' },
  { value: 'poor_quality', label: 'Poor image quality' },
  { value: 'watermark', label: 'Contains watermark/logo' },
  { value: 'screenshot', label: 'Screenshot/meme/not a photo' },
  { value: 'duplicate', label: 'Duplicate submission' },
  { value: 'other', label: 'Other reason' },
];

const AdminExerciseImages: React.FC = () => {
  const { getAuthHeader } = useAuth();
  const [submissions, setSubmissions] = useState<ImageSubmission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<ImageSubmission | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/exercise-images/admin/pending', {
        headers: getAuthHeader(),
      });
      if (!response.ok) throw new Error('Failed to fetch submissions');
      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/exercise-images/admin/stats', {
        headers: getAuthHeader(),
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchSubmissions();
    fetchStats();
  }, [fetchSubmissions, fetchStats]);

  const handleReview = async (submissionId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      setReviewing(submissionId);
      const response = await fetch(`/api/exercise-images/admin/review/${submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action, reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Review failed');
      }

      // Remove from list and refresh stats
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      setSelectedSubmission(null);
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setReviewing(null);
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/empire"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-violet-400" />
                Exercise Image Review
              </h1>
              <p className="text-gray-400 text-sm">Review and approve community-submitted exercise images</p>
            </div>
          </div>
          <button
            onClick={() => { fetchSubmissions(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <GlassSurface className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-400">{stats.pending}</div>
              <div className="text-sm text-gray-400">Pending</div>
            </GlassSurface>
            <GlassSurface className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{stats.approved}</div>
              <div className="text-sm text-gray-400">Approved</div>
            </GlassSurface>
            <GlassSurface className="p-4 text-center">
              <div className="text-3xl font-bold text-red-400">{stats.rejected}</div>
              <div className="text-sm text-gray-400">Rejected</div>
            </GlassSurface>
            <GlassSurface className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">{stats.totalToday}</div>
              <div className="text-sm text-gray-400">Today</div>
            </GlassSurface>
            <GlassSurface className="p-4 text-center">
              <div className="text-3xl font-bold text-violet-400">{stats.avgReviewTime}s</div>
              <div className="text-sm text-gray-400">Avg Review</div>
            </GlassSurface>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submissions list */}
          <div className="lg:col-span-2">
            <GlassSurface className="p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                Submissions ({filteredSubmissions.length})
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No {filter === 'all' ? '' : filter} submissions</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredSubmissions.map(submission => (
                    <motion.button
                      key={submission.id}
                      onClick={() => setSelectedSubmission(submission)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        selectedSubmission?.id === submission.id
                          ? 'border-violet-500'
                          : 'border-transparent hover:border-white/20'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <img
                        src={submission.thumbnailUrl}
                        alt={submission.exerciseName}
                        className="w-full aspect-square object-cover"
                      />
                      {/* Status badge */}
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
                        submission.status === 'pending'
                          ? 'bg-amber-500/80 text-white'
                          : submission.status === 'approved'
                          ? 'bg-emerald-500/80 text-white'
                          : 'bg-red-500/80 text-white'
                      }`}>
                        {submission.status}
                      </div>
                      {/* AI warning badge */}
                      {!submission.aiValidationPassed && (
                        <div className="absolute top-2 left-2 p-1 rounded bg-red-500/80">
                          <AlertTriangle className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {/* Exercise name */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-xs text-white truncate">{submission.exerciseName}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </GlassSurface>
          </div>

          {/* Review panel */}
          <div className="lg:col-span-1">
            <GlassSurface className="p-4 sticky top-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-gray-400" />
                Review Panel
              </h2>

              {selectedSubmission ? (
                <SubmissionReviewPanel
                  submission={selectedSubmission}
                  onApprove={() => handleReview(selectedSubmission.id, 'approve')}
                  onReject={(reason) => handleReview(selectedSubmission.id, 'reject', reason)}
                  isReviewing={reviewing === selectedSubmission.id}
                />
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a submission to review</p>
                </div>
              )}
            </GlassSurface>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SubmissionReviewPanelProps {
  submission: ImageSubmission;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isReviewing: boolean;
}

const SubmissionReviewPanel: React.FC<SubmissionReviewPanelProps> = ({
  submission,
  onApprove,
  onReject,
  isReviewing,
}) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleReject = () => {
    if (!rejectionReason) return;
    onReject(rejectionReason);
    setShowRejectForm(false);
    setRejectionReason('');
  };

  return (
    <div className="space-y-4">
      {/* Full image */}
      <div className="rounded-lg overflow-hidden">
        <img
          src={submission.processedUrl || submission.thumbnailUrl}
          alt={submission.exerciseName}
          className="w-full aspect-video object-contain bg-black/50"
        />
      </div>

      {/* Exercise info */}
      <div>
        <h3 className="font-semibold text-white">{submission.exerciseName}</h3>
        <p className="text-sm text-gray-400">Exercise ID: {submission.exerciseId}</p>
      </div>

      {/* Submitter info */}
      <div className="flex items-center gap-3 text-sm">
        <User className="w-4 h-4 text-gray-400" />
        <span className="text-gray-300">{submission.username}</span>
        <Calendar className="w-4 h-4 text-gray-400 ml-2" />
        <span className="text-gray-400">
          {new Date(submission.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* AI Validation Scores */}
      <div className="p-3 bg-white/5 rounded-lg space-y-2">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          AI Validation
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-400">NSFW Score</div>
            <div className={`font-mono text-lg ${
              submission.nsfwScore > 0.3 ? 'text-red-400' :
              submission.nsfwScore > 0.15 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {(submission.nsfwScore * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Exercise Match</div>
            <div className={`font-mono text-lg ${
              submission.exerciseMatchScore > 0.7 ? 'text-emerald-400' :
              submission.exerciseMatchScore > 0.4 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {(submission.exerciseMatchScore * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        {submission.aiValidationNotes && (
          <div className="mt-2 text-xs text-gray-400 border-t border-white/10 pt-2">
            {submission.aiValidationNotes}
          </div>
        )}
        <div className={`flex items-center gap-2 text-sm ${
          submission.aiValidationPassed ? 'text-emerald-400' : 'text-amber-400'
        }`}>
          {submission.aiValidationPassed ? (
            <>
              <CheckCircle className="w-4 h-4" />
              AI Validation Passed
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" />
              Requires Manual Review
            </>
          )}
        </div>
      </div>

      {/* Already reviewed */}
      {submission.status !== 'pending' && (
        <div className={`p-3 rounded-lg ${
          submission.status === 'approved' ? 'bg-emerald-500/10 border border-emerald-500/30' :
          'bg-red-500/10 border border-red-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {submission.status === 'approved' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={submission.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}>
              {submission.status === 'approved' ? 'Approved' : 'Rejected'}
            </span>
          </div>
          {submission.rejectionReason && (
            <p className="text-sm text-gray-400 mt-1">Reason: {submission.rejectionReason}</p>
          )}
          {submission.reviewedAt && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(submission.reviewedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Action buttons (only for pending) */}
      {submission.status === 'pending' && (
        <AnimatePresence mode="wait">
          {showRejectForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
              >
                <option value="">Select rejection reason...</option>
                {REJECTION_REASONS.map(reason => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason || isReviewing}
                  className="flex-1 py-2 px-4 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm transition-colors disabled:opacity-50"
                >
                  {isReviewing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Reject'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-3"
            >
              <button
                onClick={onApprove}
                disabled={isReviewing}
                className="flex-1 py-3 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-400 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isReviewing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve
                  </>
                )}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={isReviewing}
                className="flex-1 py-3 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default AdminExerciseImages;
