import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Camera,
  History,
  AlertTriangle,
  ChevronRight,
  Trash2,
  RefreshCw,
  Clock,
  Shield,
} from 'lucide-react';
import { fetchWithLogging } from '../../utils/logger';
import { useAuth } from '../../store/authStore';

interface Snapshot {
  id: string;
  name: string;
  description: string | null;
  snapshotType: string;
  archetypeId: string | null;
  archetypeLevel: number | null;
  totalTu: number;
  totalWorkouts: number;
  createdAt: string;
  isRestorable: boolean;
  restoredCount: number;
}

interface JourneySettings {
  autoSnapshotEnabled: boolean;
  snapshotRetentionDays: number;
  lastAutoSnapshotAt: string | null;
  totalSnapshots: number;
}

export function JourneyManagement() {
  const navigate = useNavigate();
  const { token, logout: _logout } = useAuth();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [settings, setSettings] = useState<JourneySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateSnapshot, setShowCreateSnapshot] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showFreshStartConfirm, setShowFreshStartConfirm] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState<Snapshot | null>(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [freshStartPhrase, setFreshStartPhrase] = useState('');

  // Load snapshots and settings
  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        const [snapshotsRes, settingsRes] = await Promise.all([
          fetchWithLogging('/api/journey/snapshots?limit=5', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetchWithLogging('/api/journey/settings', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (snapshotsRes.ok) {
          const data = await snapshotsRes.json();
          setSnapshots(data.data?.snapshots || []);
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(data.data);
        }
      } catch (err) {
        console.error('Failed to load journey data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  // Create snapshot
  const handleCreateSnapshot = async () => {
    if (!snapshotName.trim() || saving) return;
    setSaving(true);

    try {
      const res = await fetchWithLogging('/api/journey/snapshots', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: snapshotName.trim(),
          description: snapshotDesc.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSnapshots(prev => [data.data, ...prev]);
        setShowCreateSnapshot(false);
        setSnapshotName('');
        setSnapshotDesc('');
      }
    } catch (err) {
      console.error('Failed to create snapshot:', err);
    } finally {
      setSaving(false);
    }
  };

  // Restore from snapshot
  const handleRestore = async (snapshot: Snapshot) => {
    if (saving) return;
    setSaving(true);

    try {
      const res = await fetchWithLogging(`/api/journey/snapshots/${snapshot.id}/restore`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          components: ['archetype', 'profile', 'equipment'],
        }),
      });

      if (res.ok) {
        setShowRestoreModal(null);
        // Refresh the page to show updated state
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete snapshot
  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (saving) return;
    setSaving(true);

    try {
      const res = await fetchWithLogging(`/api/journey/snapshots/${snapshotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
      }
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
    } finally {
      setSaving(false);
    }
  };

  // Restart onboarding
  const handleRestartOnboarding = async (clearArchetype: boolean) => {
    if (saving) return;
    setSaving(true);

    try {
      const res = await fetchWithLogging('/api/journey/restart-onboarding', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clearArchetype }),
      });

      if (res.ok) {
        setShowRestartConfirm(false);
        navigate('/onboarding');
      }
    } catch (err) {
      console.error('Failed to restart onboarding:', err);
    } finally {
      setSaving(false);
    }
  };

  // Fresh start
  const handleFreshStart = async () => {
    if (freshStartPhrase !== 'FRESH START' || saving) return;
    setSaving(true);

    try {
      const res = await fetchWithLogging('/api/journey/fresh-start', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmPhrase: 'FRESH START' }),
      });

      if (res.ok) {
        setShowFreshStartConfirm(false);
        // Navigate to onboarding for fresh start
        navigate('/onboarding');
      }
    } catch (err) {
      console.error('Failed to do fresh start:', err);
    } finally {
      setSaving(false);
    }
  };

  // Update settings
  const handleToggleAutoSnapshot = async () => {
    if (!settings) return;
    const newValue = !settings.autoSnapshotEnabled;

    try {
      await fetchWithLogging('/api/journey/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ autoSnapshotEnabled: newValue }),
      });

      setSettings(prev => prev ? { ...prev, autoSnapshotEnabled: newValue } : null);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-700 rounded w-1/3" />
        <div className="h-20 bg-gray-700 rounded" />
        <div className="h-20 bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowCreateSnapshot(true)}
          className="flex items-center gap-3 p-4 bg-blue-900/30 border border-blue-600/30 rounded-xl hover:bg-blue-900/40 transition-colors text-left"
        >
          <Camera className="w-5 h-5 text-blue-400" />
          <div>
            <div className="font-medium text-sm">Create Snapshot</div>
            <div className="text-xs text-gray-400">Save current progress</div>
          </div>
        </button>

        <button
          onClick={() => setShowRestartConfirm(true)}
          className="flex items-center gap-3 p-4 bg-purple-900/30 border border-purple-600/30 rounded-xl hover:bg-purple-900/40 transition-colors text-left"
        >
          <RotateCcw className="w-5 h-5 text-purple-400" />
          <div>
            <div className="font-medium text-sm">Restart Setup</div>
            <div className="text-xs text-gray-400">Redo onboarding</div>
          </div>
        </button>
      </div>

      {/* Auto-snapshot Setting */}
      {settings && (
        <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-400" />
            <div>
              <div className="font-medium text-sm">Auto-Snapshots</div>
              <div className="text-xs text-gray-400">
                Save before archetype changes
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleAutoSnapshot}
            className={`w-12 h-6 rounded-full transition-all duration-200 ${
              settings.autoSnapshotEnabled ? 'bg-green-600' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 mx-0.5 ${
                settings.autoSnapshotEnabled ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>
      )}

      {/* Recent Snapshots */}
      {snapshots.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Snapshots ({settings?.totalSnapshots || snapshots.length})
            </h3>
          </div>
          <div className="space-y-2">
            {snapshots.slice(0, 3).map(snapshot => (
              <div
                key={snapshot.id}
                className="p-3 bg-gray-700/50 rounded-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{snapshot.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(snapshot.createdAt)}
                      {snapshot.archetypeId && (
                        <span className="text-purple-400">
                          {snapshot.archetypeId}
                        </span>
                      )}
                    </div>
                    {snapshot.totalTu > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round(snapshot.totalTu).toLocaleString()} TU | {snapshot.totalWorkouts} workouts
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {snapshot.isRestorable && (
                      <button
                        onClick={() => setShowRestoreModal(snapshot)}
                        className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Restore"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteSnapshot(snapshot.id)}
                      className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fresh Start - Danger Zone */}
      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => setShowFreshStartConfirm(true)}
          className="w-full flex items-center justify-between p-4 bg-red-900/20 border border-red-600/30 rounded-xl hover:bg-red-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="text-left">
              <div className="font-medium text-red-400">Fresh Start</div>
              <div className="text-xs text-gray-400">Reset all progress (backup saved)</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Create Snapshot Modal */}
      <AnimatePresence>
        {showCreateSnapshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateSnapshot(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-400" />
                Create Snapshot
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Save your current progress so you can return to this point later.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={snapshotName}
                    onChange={e => setSnapshotName(e.target.value)}
                    placeholder="e.g., Before trying powerlifting"
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <textarea
                    value={snapshotDesc}
                    onChange={e => setSnapshotDesc(e.target.value)}
                    placeholder="Notes about this snapshot..."
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 resize-none"
                    rows={2}
                    maxLength={500}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateSnapshot(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSnapshot}
                  disabled={!snapshotName.trim() || saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium"
                >
                  {saving ? 'Saving...' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restart Onboarding Modal */}
      <AnimatePresence>
        {showRestartConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRestartConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-400" />
                Restart Onboarding
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Go through the setup process again. Your workout history will be preserved.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleRestartOnboarding(false)}
                  disabled={saving}
                  className="w-full p-4 bg-purple-900/30 border border-purple-600/30 rounded-xl hover:bg-purple-900/40 transition-colors text-left"
                >
                  <div className="font-medium">Keep Current Archetype</div>
                  <div className="text-sm text-gray-400">
                    Skip archetype selection, just update equipment
                  </div>
                </button>
                <button
                  onClick={() => handleRestartOnboarding(true)}
                  disabled={saving}
                  className="w-full p-4 bg-blue-900/30 border border-blue-600/30 rounded-xl hover:bg-blue-900/40 transition-colors text-left"
                >
                  <div className="font-medium">Choose New Archetype</div>
                  <div className="text-sm text-gray-400">
                    Start fresh with archetype selection
                  </div>
                </button>
              </div>
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="w-full mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restore Modal */}
      <AnimatePresence>
        {showRestoreModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRestoreModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                Restore Snapshot
              </h3>
              <div className="p-4 bg-gray-700/50 rounded-xl mb-4">
                <div className="font-medium">{showRestoreModal.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {formatDate(showRestoreModal.createdAt)}
                </div>
                {showRestoreModal.archetypeId && (
                  <div className="text-sm text-purple-400 mt-1">
                    Archetype: {showRestoreModal.archetypeId}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">
                This will restore your archetype, profile, and equipment settings to this snapshot.
                Your workout history will not be affected.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRestoreModal(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRestore(showRestoreModal)}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium"
                >
                  {saving ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fresh Start Confirmation Modal */}
      <AnimatePresence>
        {showFreshStartConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFreshStartConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 border border-red-600/50 rounded-xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Fresh Start
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-300">
                  This will reset all your progress:
                </p>
                <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
                  <li>Your archetype will be cleared</li>
                  <li>Your equipment settings will be reset</li>
                  <li>Your goals will be cancelled</li>
                  <li>You&apos;ll need to redo onboarding</li>
                </ul>
                <p className="text-sm text-green-400">
                  Your workout history will be preserved, and a backup snapshot will be created automatically.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type <span className="text-red-400 font-mono">FRESH START</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={freshStartPhrase}
                    onChange={e => setFreshStartPhrase(e.target.value)}
                    placeholder="FRESH START"
                    className="w-full p-3 bg-gray-700 border border-red-600/30 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowFreshStartConfirm(false);
                    setFreshStartPhrase('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFreshStart}
                  disabled={freshStartPhrase !== 'FRESH START' || saving}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg font-medium"
                >
                  {saving ? 'Resetting...' : 'Reset Everything'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default JourneyManagement;
