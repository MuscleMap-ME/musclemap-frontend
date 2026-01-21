/**
 * Limitations Page - MuscleMap Liquid Glass Design
 *
 * Manage physical limitations, disabilities, and exercise modifications.
 * Provides personalized exercise substitutions based on user's limitations.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { api } from '../utils/api';
import {
  GlassSurface,
  GlassButton,
  GlassNav,
  AnimatedLogo,
  GlassMobileNav,
  MeshBackground,
} from '../components/glass';

// Icons
const Icons = {
  Body: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Plus: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  X: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Warning: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Check: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Edit: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
};

// Limitation type metadata
const LIMITATION_TYPES = {
  injury: { label: 'Injury', color: '#ef4444', icon: '🩹' },
  chronic_condition: { label: 'Chronic Condition', color: '#f59e0b', icon: '⚕️' },
  disability: { label: 'Disability', color: '#8b5cf6', icon: '♿' },
  surgery_recovery: { label: 'Surgery Recovery', color: '#3b82f6', icon: '🏥' },
  mobility_restriction: { label: 'Mobility Restriction', color: '#06b6d4', icon: '🚶' },
  pain: { label: 'Pain', color: '#ec4899', icon: '😣' },
  weakness: { label: 'Weakness', color: '#6366f1', icon: '💪' },
  amputation: { label: 'Amputation', color: '#14b8a6', icon: '🦿' },
  prosthetic: { label: 'Prosthetic', color: '#10b981', icon: '🦾' },
  age_related: { label: 'Age-Related', color: '#78716c', icon: '👴' },
  pregnancy: { label: 'Pregnancy', color: '#f472b6', icon: '🤰' },
  other: { label: 'Other', color: '#64748b', icon: '📋' },
};

const SEVERITY_LEVELS = {
  mild: { label: 'Mild', color: '#22c55e', description: 'Minor restriction, most exercises okay' },
  moderate: { label: 'Moderate', color: '#f59e0b', description: 'Some exercises need modification' },
  severe: { label: 'Severe', color: '#ef4444', description: 'Significant restrictions, many modifications needed' },
  complete: { label: 'Complete', color: '#7f1d1d', description: 'Unable to use this body part' },
};

const STATUS_TYPES = {
  active: { label: 'Active', color: '#ef4444' },
  recovering: { label: 'Recovering', color: '#f59e0b' },
  resolved: { label: 'Resolved', color: '#22c55e' },
  permanent: { label: 'Permanent', color: '#64748b' },
};

// Limitation Card Component
function LimitationCard({ limitation, onEdit, onDelete }) {
  const typeMeta = LIMITATION_TYPES[limitation.limitationType] || LIMITATION_TYPES.other;
  const severityMeta = SEVERITY_LEVELS[limitation.severity] || SEVERITY_LEVELS.moderate;
  const statusMeta = STATUS_TYPES[limitation.status] || STATUS_TYPES.active;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-[var(--glass-white-5)] backdrop-blur-xl border border-[var(--border-subtle)]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeMeta.icon}</span>
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">{limitation.name}</h3>
            <p className="text-sm text-[var(--text-tertiary)]">{typeMeta.label}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(limitation)}
            className="p-2 rounded-lg hover:bg-[var(--glass-white-10)] transition-colors"
          >
            <Icons.Edit className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
          <button
            onClick={() => onDelete(limitation.id)}
            className="p-2 rounded-lg hover:bg-[var(--glass-white-10)] transition-colors"
          >
            <Icons.Trash className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>
      </div>

      {limitation.bodyRegionName && (
        <div className="text-sm text-[var(--text-secondary)] mb-3">
          <span className="text-[var(--text-tertiary)]">Body Region:</span> {limitation.bodyRegionName}
        </div>
      )}

      {limitation.description && (
        <p className="text-sm text-[var(--text-tertiary)] mb-3">{limitation.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <span
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${severityMeta.color}20`,
            color: severityMeta.color,
          }}
        >
          {severityMeta.label}
        </span>
        <span
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${statusMeta.color}20`,
            color: statusMeta.color,
          }}
        >
          {statusMeta.label}
        </span>
      </div>

      {(limitation.avoidMovements?.length > 0 || limitation.avoidImpact || limitation.avoidWeightBearing) && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Restrictions:</div>
          <div className="flex flex-wrap gap-1">
            {limitation.avoidImpact && (
              <span className="px-2 py-0.5 bg-[var(--feedback-error)]/10 text-[var(--feedback-error)] rounded text-xs">
                No Impact
              </span>
            )}
            {limitation.avoidWeightBearing && (
              <span className="px-2 py-0.5 bg-[var(--feedback-error)]/10 text-[var(--feedback-error)] rounded text-xs">
                No Weight Bearing
              </span>
            )}
            {limitation.maxWeightLbs && (
              <span className="px-2 py-0.5 bg-[var(--feedback-warning)]/10 text-[var(--feedback-warning)] rounded text-xs">
                Max {limitation.maxWeightLbs} lbs
              </span>
            )}
            {limitation.avoidMovements?.map(m => (
              <span key={m} className="px-2 py-0.5 bg-[var(--feedback-error)]/10 text-[var(--feedback-error)] rounded text-xs">
                {m.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {limitation.expectedRecoveryDate && (
        <div className="mt-3 text-xs text-[var(--text-quaternary)]">
          Expected recovery: {new Date(limitation.expectedRecoveryDate).toLocaleDateString()}
        </div>
      )}
    </motion.div>
  );
}

// Add Limitation Modal
function AddLimitationModal({ isOpen, onClose, onSubmit, bodyRegions, editingLimitation, saving = false, error = null }) {
  const [formData, setFormData] = useState({
    name: '',
    limitationType: 'injury',
    bodyRegionId: '',
    severity: 'moderate',
    status: 'active',
    description: '',
    avoidImpact: false,
    avoidWeightBearing: false,
    maxWeightLbs: '',
    onsetDate: '',
    expectedRecoveryDate: '',
  });

  useEffect(() => {
    if (editingLimitation) {
      setFormData({
        name: editingLimitation.name || '',
        limitationType: editingLimitation.limitationType || 'injury',
        bodyRegionId: editingLimitation.bodyRegionId || '',
        severity: editingLimitation.severity || 'moderate',
        status: editingLimitation.status || 'active',
        description: editingLimitation.description || '',
        avoidImpact: editingLimitation.avoidImpact || false,
        avoidWeightBearing: editingLimitation.avoidWeightBearing || false,
        maxWeightLbs: editingLimitation.maxWeightLbs || '',
        onsetDate: editingLimitation.onsetDate || '',
        expectedRecoveryDate: editingLimitation.expectedRecoveryDate || '',
      });
    } else {
      setFormData({
        name: '',
        limitationType: 'injury',
        bodyRegionId: '',
        severity: 'moderate',
        status: 'active',
        description: '',
        avoidImpact: false,
        avoidWeightBearing: false,
        maxWeightLbs: '',
        onsetDate: '',
        expectedRecoveryDate: '',
      });
    }
  }, [editingLimitation, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      maxWeightLbs: formData.maxWeightLbs ? parseInt(formData.maxWeightLbs, 10) : null,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-[var(--void-base)] border border-[var(--border-subtle)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {editingLimitation ? 'Edit Limitation' : 'Add Physical Limitation'}
            </h2>
            <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <Icons.X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                placeholder="e.g., Rotator cuff injury"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Type *
                </label>
                <select
                  value={formData.limitationType}
                  onChange={e => setFormData({ ...formData, limitationType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                >
                  {Object.entries(LIMITATION_TYPES).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.icon} {meta.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Severity
                </label>
                <select
                  value={formData.severity}
                  onChange={e => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                >
                  {Object.entries(SEVERITY_LEVELS).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Body Region
              </label>
              <select
                value={formData.bodyRegionId}
                onChange={e => setFormData({ ...formData, bodyRegionId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              >
                <option value="">Select body region</option>
                {bodyRegions.map(region => (
                  <optgroup key={region.id} label={region.name}>
                    {region.children?.map(child => (
                      <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              >
                {Object.entries(STATUS_TYPES).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                placeholder="Describe the limitation..."
              />
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-4">
              <div className="text-sm font-medium text-[var(--text-secondary)] mb-3">Restrictions</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.avoidImpact}
                    onChange={e => setFormData({ ...formData, avoidImpact: e.target.checked })}
                    className="rounded border-[var(--border-subtle)]"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">Avoid impact exercises</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.avoidWeightBearing}
                    onChange={e => setFormData({ ...formData, avoidWeightBearing: e.target.checked })}
                    className="rounded border-[var(--border-subtle)]"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">Avoid weight-bearing exercises</span>
                </label>
              </div>
              <div className="mt-3">
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Maximum weight (lbs)
                </label>
                <input
                  type="number"
                  value={formData.maxWeightLbs}
                  onChange={e => setFormData({ ...formData, maxWeightLbs: e.target.value })}
                  className="w-32 px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Onset Date
                </label>
                <input
                  type="date"
                  value={formData.onsetDate}
                  onChange={e => setFormData({ ...formData, onsetDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Expected Recovery
                </label>
                <input
                  type="date"
                  value={formData.expectedRecoveryDate}
                  onChange={e => setFormData({ ...formData, expectedRecoveryDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[var(--feedback-error)]/10 border border-[var(--feedback-error)]/20 text-[var(--feedback-error)] text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <GlassButton type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="primary" className="flex-1" disabled={saving}>
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  editingLimitation ? 'Save Changes' : 'Add Limitation'
                )}
              </GlassButton>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Main Limitations Page
export default function Limitations() {
  const { user: _user } = useUser();
  const [limitations, setLimitations] = useState([]);
  const [bodyRegions, setBodyRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLimitation, setEditingLimitation] = useState(null);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    loadLimitations();
    loadBodyRegions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadLimitations = async () => {
    try {
      const status = filter !== 'all' ? filter : undefined;
      const response = await api.get(`/limitations${status ? `?status=${status}` : ''}`);
      // API returns { data: { data: { limitations: [...] } } } due to double wrapping
      const limitations = response.data?.data?.limitations || response.data?.limitations || [];
      setLimitations(limitations);
    } catch (error) {
      console.error('Failed to load limitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBodyRegions = async () => {
    try {
      const response = await api.get('/limitations/body-regions');
      // API returns { data: { data: { regions: [...] } } } due to double wrapping
      const regions = response.data?.data?.regions || response.data?.regions || [];
      setBodyRegions(regions);
    } catch (error) {
      console.error('Failed to load body regions:', error);
    }
  };

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddLimitation = async (data) => {
    setSaving(true);
    setError(null);
    try {
      if (editingLimitation) {
        await api.put(`/limitations/${editingLimitation.id}`, data);
      } else {
        await api.post('/limitations', data);
      }
      setShowModal(false);
      setEditingLimitation(null);
      loadLimitations();
    } catch (err) {
      console.error('Failed to save limitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to save limitation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (limitation) => {
    setEditingLimitation(limitation);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this limitation?')) return;
    try {
      await api.delete(`/limitations/${id}`);
      loadLimitations();
    } catch (error) {
      console.error('Failed to delete limitation:', error);
    }
  };

  const activeLimitations = limitations.filter(l => l.status === 'active' || l.status === 'recovering');

  return (
    <div className="min-h-screen relative">
      <MeshBackground intensity="subtle" />

      <GlassNav
        brandSlot={
          <Link to="/dashboard" className="flex items-center gap-3">
            <AnimatedLogo size={32} breathing />
            <span className="font-bold text-lg text-[var(--text-primary)] hidden sm:block">MuscleMap</span>
          </Link>
        }
      />

      <div className="flex pt-16">
        <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                  Physical Limitations
                </h1>
                <p className="text-[var(--text-secondary)]">
                  Manage injuries, disabilities, and get personalized exercise modifications
                </p>
              </div>
              <GlassButton variant="primary" onClick={() => { setEditingLimitation(null); setShowModal(true); }}>
                <Icons.Plus className="w-5 h-5 mr-2" />
                Add Limitation
              </GlassButton>
            </div>

            {/* Info Banner */}
            {activeLimitations.length > 0 && (
              <GlassSurface className="p-4 mb-6" depth="subtle">
                <div className="flex items-start gap-3">
                  <Icons.Warning className="w-5 h-5 text-[var(--feedback-warning)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">{activeLimitations.length} active limitation{activeLimitations.length !== 1 ? 's' : ''}</span> recorded.
                      Your workout prescriptions will automatically avoid or modify exercises that may aggravate these conditions.
                    </p>
                  </div>
                </div>
              </GlassSurface>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { key: 'active', label: 'Active' },
                { key: 'recovering', label: 'Recovering' },
                { key: 'resolved', label: 'Resolved' },
                { key: 'all', label: 'All' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.key
                      ? 'bg-[var(--brand-blue-500)] text-white'
                      : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Limitations List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--brand-blue-500)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : limitations.length === 0 ? (
              <GlassSurface className="p-12 text-center" depth="subtle">
                <Icons.Body className="w-16 h-16 mx-auto mb-4 text-[var(--text-quaternary)]" />
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  No Limitations Recorded
                </h3>
                <p className="text-[var(--text-tertiary)] mb-6 max-w-md mx-auto">
                  If you have any injuries, disabilities, or physical limitations, add them here to get personalized exercise modifications.
                </p>
                <GlassButton variant="primary" onClick={() => setShowModal(true)}>
                  <Icons.Plus className="w-5 h-5 mr-2" />
                  Add Your First Limitation
                </GlassButton>
              </GlassSurface>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {limitations.map(limitation => (
                  <LimitationCard
                    key={limitation.id}
                    limitation={limitation}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {/* How It Works */}
            <GlassSurface className="p-6 mt-8" depth="subtle">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">How It Works</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--brand-blue-500)]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--brand-blue-400)]">1</span>
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">Add Limitations</div>
                    <div className="text-sm text-[var(--text-tertiary)]">Record your injuries, conditions, or disabilities</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--brand-blue-500)]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--brand-blue-400)]">2</span>
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">Auto-Modifications</div>
                    <div className="text-sm text-[var(--text-tertiary)]">We automatically adjust your workouts</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--brand-blue-500)]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--brand-blue-400)]">3</span>
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">Safe Training</div>
                    <div className="text-sm text-[var(--text-tertiary)]">Train around limitations, not through them</div>
                  </div>
                </div>
              </div>
            </GlassSurface>
          </div>
        </main>
      </div>

      <GlassMobileNav items={[
        { to: '/dashboard', icon: Icons.Body, label: 'Home' },
        { to: '/limitations', icon: Icons.Body, label: 'Limitations', active: true },
        { to: '/profile', icon: Icons.Body, label: 'Profile' },
      ]} />

      <AddLimitationModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingLimitation(null); }}
        onSubmit={handleAddLimitation}
        bodyRegions={bodyRegions}
        editingLimitation={editingLimitation}
      />
    </div>
  );
}
