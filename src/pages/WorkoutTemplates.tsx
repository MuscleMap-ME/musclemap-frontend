/**
 * Workout Templates Page
 *
 * Save, browse, and use workout templates - like Hevy/Strong routines.
 * Features:
 * - My Templates: User's created/saved templates
 * - Discover: Public templates from the community
 * - Create: Build new templates from scratch
 * - Quick Start: Start workout from template
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Star,
  Clock,
  Dumbbell,
  Users,
  Copy,
  Edit,
  Trash2,
  Play,
  Bookmark,
  BookmarkCheck,
  Filter,
  ChevronDown,
  ArrowLeft,
  Flame,
  Target,
  Zap,
  X,
  Save,
} from 'lucide-react';
import { useAuth } from '../store/authStore';
import { useToast } from '../hooks';
import api from '../utils/api';

// Types
interface TemplateExercise {
  exerciseId: string;
  name?: string;
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restSeconds?: number;
  notes?: string;
}

interface WorkoutTemplate {
  id: string;
  creatorId: string;
  creatorUsername?: string;
  creatorDisplayName?: string;
  name: string;
  description?: string;
  exercises: TemplateExercise[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  durationMinutes?: number;
  targetMuscles: string[];
  equipmentRequired: string[];
  category?: 'strength' | 'hypertrophy' | 'endurance' | 'cardio' | 'mobility' | 'full_body';
  tags: string[];
  isPublic: boolean;
  isFeatured: boolean;
  timesUsed: number;
  timesCloned: number;
  averageRating?: number;
  ratingCount: number;
  userRating?: number;
  isSaved?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Constants
const DIFFICULTY_CONFIG = {
  beginner: { label: 'Beginner', color: 'text-green-400 bg-green-500/20 border-green-500/30' },
  intermediate: { label: 'Intermediate', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' },
  advanced: { label: 'Advanced', color: 'text-orange-400 bg-orange-500/20 border-orange-500/30' },
  elite: { label: 'Elite', color: 'text-red-400 bg-red-500/20 border-red-500/30' },
};

const CATEGORY_CONFIG = {
  strength: { label: 'Strength', icon: Dumbbell, color: 'text-blue-400' },
  hypertrophy: { label: 'Hypertrophy', icon: Target, color: 'text-purple-400' },
  endurance: { label: 'Endurance', icon: Flame, color: 'text-orange-400' },
  cardio: { label: 'Cardio', icon: Zap, color: 'text-red-400' },
  mobility: { label: 'Mobility', icon: Users, color: 'text-green-400' },
  full_body: { label: 'Full Body', icon: Star, color: 'text-yellow-400' },
};

// Tab type
type TabType = 'my' | 'saved' | 'discover' | 'create';

export default function WorkoutTemplates() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [myTemplates, setMyTemplates] = useState<WorkoutTemplate[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<WorkoutTemplate[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Create mode state
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    exercises: [] as TemplateExercise[],
    difficulty: '' as string,
    durationMinutes: 45,
    category: '' as string,
    tags: [] as string[],
    isPublic: false,
  });

  // Fetch templates
  const fetchMyTemplates = useCallback(async () => {
    try {
      const response = await api.get('/templates/me');
      setMyTemplates(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch my templates:', err);
    }
  }, []);

  const fetchSavedTemplates = useCallback(async () => {
    try {
      const response = await api.get('/templates/saved');
      setSavedTemplates(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch saved templates:', err);
    }
  }, []);

  const fetchPublicTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      if (difficultyFilter) params.set('difficulty', difficultyFilter);
      params.set('sortBy', 'popular');
      params.set('limit', '50');

      const response = await api.get(`/templates?${params.toString()}`);
      setPublicTemplates(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch public templates:', err);
    }
  }, [search, categoryFilter, difficultyFilter]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMyTemplates(),
        fetchSavedTemplates(),
        fetchPublicTemplates(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchMyTemplates, fetchSavedTemplates, fetchPublicTemplates]);

  // Handlers
  const handleSaveTemplate = async (templateId: string) => {
    try {
      await api.post(`/templates/${templateId}/save`);
      toast('Template saved!');
      fetchSavedTemplates();
    } catch (_err) {
      showError('Failed to save template');
    }
  };

  const handleUnsaveTemplate = async (templateId: string) => {
    try {
      await api.delete(`/templates/${templateId}/save`);
      toast('Template removed from saved');
      fetchSavedTemplates();
    } catch (_err) {
      showError('Failed to unsave template');
    }
  };

  const handleCloneTemplate = async (templateId: string) => {
    try {
      await api.post(`/templates/${templateId}/clone`);
      toast('Template cloned to your templates!');
      fetchMyTemplates();
      setActiveTab('my');
    } catch (_err) {
      showError('Failed to clone template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      await api.delete(`/templates/${templateId}`);
      toast('Template deleted');
      fetchMyTemplates();
    } catch (_err) {
      showError('Failed to delete template');
    }
  };

  const handleStartWorkout = (template: WorkoutTemplate) => {
    // Navigate to workout page with template context
    navigate('/workout', { state: { template } });
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      showError('Template name is required');
      return;
    }
    if (newTemplate.exercises.length === 0) {
      showError('Add at least one exercise');
      return;
    }

    try {
      const payload = {
        name: newTemplate.name.trim(),
        description: newTemplate.description.trim() || undefined,
        exercises: newTemplate.exercises,
        difficulty: newTemplate.difficulty || undefined,
        durationMinutes: newTemplate.durationMinutes || undefined,
        category: newTemplate.category || undefined,
        tags: newTemplate.tags.length > 0 ? newTemplate.tags : undefined,
        isPublic: newTemplate.isPublic,
      };

      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate.id}`, payload);
        toast('Template updated!');
      } else {
        await api.post('/templates', payload);
        toast('Template created!');
      }

      setIsCreating(false);
      setEditingTemplate(null);
      setNewTemplate({
        name: '',
        description: '',
        exercises: [],
        difficulty: '',
        durationMinutes: 45,
        category: '',
        tags: [],
        isPublic: false,
      });
      fetchMyTemplates();
      setActiveTab('my');
    } catch (_err) {
      showError('Failed to save template');
    }
  };

  const handleEditTemplate = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      description: template.description || '',
      exercises: template.exercises,
      difficulty: template.difficulty || '',
      durationMinutes: template.durationMinutes || 45,
      category: template.category || '',
      tags: template.tags,
      isPublic: template.isPublic,
    });
    setIsCreating(true);
  };

  // Filter templates based on active tab and search
  const displayedTemplates = useMemo(() => {
    let templates: WorkoutTemplate[] = [];

    switch (activeTab) {
      case 'my':
        templates = myTemplates;
        break;
      case 'saved':
        templates = savedTemplates;
        break;
      case 'discover':
        templates = publicTemplates;
        break;
      default:
        templates = [];
    }

    if (search && activeTab !== 'discover') {
      const lowerSearch = search.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(lowerSearch) ||
        t.description?.toLowerCase().includes(lowerSearch)
      );
    }

    return templates;
  }, [activeTab, myTemplates, savedTemplates, publicTemplates, search]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Sign in Required</h2>
          <p className="text-gray-400 mb-4">Please sign in to access workout templates</p>
          <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link to="/workout" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">Workout Templates</h1>
                <p className="text-sm text-gray-400">Save & reuse your favorite routines</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsCreating(true);
                setEditingTemplate(null);
                setNewTemplate({
                  name: '',
                  description: '',
                  exercises: [],
                  difficulty: '',
                  durationMinutes: 45,
                  category: '',
                  tags: [],
                  isPublic: false,
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-900 p-1 rounded-xl">
            {[
              { id: 'my', label: 'My Templates', count: myTemplates.length },
              { id: 'saved', label: 'Saved', count: savedTemplates.length },
              { id: 'discover', label: 'Discover', count: null },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded bg-gray-700">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tips Banner - First time users */}
        {myTemplates.length === 0 && activeTab === 'my' && (
          <div className="max-w-6xl mx-auto px-4 pb-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h3 className="font-medium text-white mb-1">Welcome to Workout Templates!</h3>
                  <p className="text-sm text-gray-300">
                    Create reusable workout routines to save time. Click <strong>Create</strong> to build your first template,
                    or browse <strong>Discover</strong> to find popular routines from the community.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    <span className="px-2 py-1 bg-white/10 rounded-lg">✨ Save your favorite workout splits</span>
                    <span className="px-2 py-1 bg-white/10 rounded-lg">🔄 Reuse with one tap</span>
                    <span className="px-2 py-1 bg-white/10 rounded-lg">📤 Share with friends</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {activeTab === 'discover' && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 rounded-xl border ${
                  showFilters || categoryFilter || difficultyFilter
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Filter className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter options */}
          <AnimatePresence>
            {showFilters && activeTab === 'discover' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 mt-3">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm"
                  >
                    <option value="">All Categories</option>
                    {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm"
                  >
                    <option value="">All Difficulties</option>
                    {Object.entries(DIFFICULTY_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : displayedTemplates.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-900 flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              {activeTab === 'my' ? 'No templates yet' :
               activeTab === 'saved' ? 'No saved templates' :
               'No templates found'}
            </h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'my' ? 'Create your first template to save your favorite routines' :
               activeTab === 'saved' ? 'Save templates from the Discover tab' :
               'Try different search terms or filters'}
            </p>
            {activeTab === 'my' && (
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Create Template
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isOwner={template.creatorId === user?.id}
                onStart={() => handleStartWorkout(template)}
                onSave={() => handleSaveTemplate(template.id)}
                onUnsave={() => handleUnsaveTemplate(template.id)}
                onClone={() => handleCloneTemplate(template.id)}
                onEdit={() => handleEditTemplate(template)}
                onDelete={() => handleDeleteTemplate(template.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isCreating && (
          <TemplateEditor
            template={newTemplate}
            isEditing={!!editingTemplate}
            onChange={setNewTemplate}
            onSave={handleCreateTemplate}
            onCancel={() => {
              setIsCreating(false);
              setEditingTemplate(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  isOwner,
  onStart,
  onSave,
  onUnsave,
  onClone,
  onEdit,
  onDelete,
}: {
  template: WorkoutTemplate;
  isOwner: boolean;
  onStart: () => void;
  onSave: () => void;
  onUnsave: () => void;
  onClone: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const CategoryIcon = template.category ? CATEGORY_CONFIG[template.category]?.icon : Dumbbell;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{template.name}</h3>
            {template.creatorUsername && !isOwner && (
              <p className="text-xs text-gray-500">by {template.creatorDisplayName || template.creatorUsername}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {template.isFeatured && (
              <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded">
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">{template.description}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          {template.category && CategoryIcon && (
            <span className={`flex items-center gap-1 ${CATEGORY_CONFIG[template.category]?.color}`}>
              <CategoryIcon className="w-3.5 h-3.5" />
              {CATEGORY_CONFIG[template.category]?.label}
            </span>
          )}
          {template.difficulty && (
            <span className={`px-2 py-0.5 rounded border ${DIFFICULTY_CONFIG[template.difficulty]?.color}`}>
              {DIFFICULTY_CONFIG[template.difficulty]?.label}
            </span>
          )}
          {template.durationMinutes && (
            <span className="flex items-center gap-1 text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              {template.durationMinutes}min
            </span>
          )}
        </div>

        {/* Exercises preview */}
        <div className="flex items-center gap-1 mb-3 text-sm text-gray-400">
          <Dumbbell className="w-4 h-4" />
          <span>{template.exercises.length} exercises</span>
          {template.exercises.slice(0, 3).map((ex, i) => (
            <span key={i} className="text-gray-600">
              {i > 0 && '•'} {ex.name || 'Exercise'}
            </span>
          ))}
          {template.exercises.length > 3 && <span className="text-gray-600">...</span>}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          {template.averageRating && template.averageRating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              {template.averageRating.toFixed(1)} ({template.ratingCount})
            </span>
          )}
          <span className="flex items-center gap-1">
            <Play className="w-3.5 h-3.5" />
            {template.timesUsed} uses
          </span>
          {template.timesCloned > 0 && (
            <span className="flex items-center gap-1">
              <Copy className="w-3.5 h-3.5" />
              {template.timesCloned}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onStart}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm"
          >
            <Play className="w-4 h-4" />
            Start Workout
          </button>

          <div className="flex items-center gap-1">
            {!isOwner && (
              <>
                <button
                  onClick={template.isSaved ? onUnsave : onSave}
                  className={`p-2 rounded-lg ${
                    template.isSaved
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                  title={template.isSaved ? 'Unsave' : 'Save'}
                >
                  {template.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
                <button
                  onClick={onClone}
                  className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-lg"
                  title="Clone to my templates"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </>
            )}
            {isOwner && (
              <>
                <button
                  onClick={onEdit}
                  className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-lg"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 bg-gray-800 text-red-400 hover:text-red-300 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Template Editor Modal
function TemplateEditor({
  template,
  isEditing,
  onChange,
  onSave,
  onCancel,
}: {
  template: {
    name: string;
    description: string;
    exercises: TemplateExercise[];
    difficulty: string;
    durationMinutes: number;
    category: string;
    tags: string[];
    isPublic: boolean;
  };
  isEditing: boolean;
  onChange: (t: typeof template) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string }>>([]);
  const [_searchLoading, setSearchLoading] = useState(false);

  // Search exercises
  useEffect(() => {
    if (!exerciseSearch.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await api.get(`/exercises?search=${encodeURIComponent(exerciseSearch)}&limit=10`);
        setSearchResults(response.data?.data || []);
      } catch (_err) {
        // Failed to search exercises
      }
      setSearchLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [exerciseSearch]);

  const addExercise = (exercise: { id: string; name: string }) => {
    onChange({
      ...template,
      exercises: [
        ...template.exercises,
        { exerciseId: exercise.id, name: exercise.name, sets: 3, reps: 10 },
      ],
    });
    setExerciseSearch('');
    setSearchResults([]);
  };

  const updateExercise = (index: number, updates: Partial<TemplateExercise>) => {
    const newExercises = [...template.exercises];
    newExercises[index] = { ...newExercises[index], ...updates };
    onChange({ ...template, exercises: newExercises });
  };

  const removeExercise = (index: number) => {
    onChange({
      ...template,
      exercises: template.exercises.filter((_, i) => i !== index),
    });
  };

  const moveExercise = (from: number, to: number) => {
    const newExercises = [...template.exercises];
    const [removed] = newExercises.splice(from, 1);
    newExercises.splice(to, 0, removed);
    onChange({ ...template, exercises: newExercises });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="min-h-screen flex items-start justify-center p-4 pt-20">
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold">{isEditing ? 'Edit Template' : 'Create Template'}</h2>
            <button onClick={onCancel} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Template Name *</label>
              <input
                type="text"
                value={template.name}
                onChange={(e) => onChange({ ...template, name: e.target.value })}
                placeholder="e.g., Push Day, Upper Body, Full Body Circuit"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={template.description}
                onChange={(e) => onChange({ ...template, description: e.target.value })}
                placeholder="Describe this workout routine..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg resize-none"
              />
            </div>

            {/* Category & Difficulty */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select
                  value={template.category}
                  onChange={(e) => onChange({ ...template, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <option value="">Select category</option>
                  {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Difficulty</label>
                <select
                  value={template.difficulty}
                  onChange={(e) => onChange({ ...template, difficulty: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <option value="">Select difficulty</option>
                  {Object.entries(DIFFICULTY_CONFIG).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={template.durationMinutes}
                onChange={(e) => onChange({ ...template, durationMinutes: parseInt(e.target.value) || 45 })}
                min={5}
                max={300}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              />
            </div>

            {/* Exercises */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Exercises *</label>

              {/* Exercise search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Search exercises to add..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                    {searchResults.map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => addExercise(ex)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-700 text-sm"
                      >
                        {ex.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Exercise list */}
              {template.exercises.length === 0 ? (
                <p className="text-center py-6 text-gray-500 text-sm bg-gray-800/50 rounded-lg">
                  Search and add exercises above
                </p>
              ) : (
                <div className="space-y-2">
                  {template.exercises.map((ex, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ex.name || `Exercise ${index + 1}`}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="number"
                            value={ex.sets}
                            onChange={(e) => updateExercise(index, { sets: parseInt(e.target.value) || 3 })}
                            min={1}
                            max={20}
                            className="w-16 px-2 py-1 bg-gray-700 rounded text-sm text-center"
                            placeholder="Sets"
                          />
                          <span className="text-gray-500 text-sm">×</span>
                          <input
                            type="number"
                            value={ex.reps || ''}
                            onChange={(e) => updateExercise(index, { reps: parseInt(e.target.value) || undefined })}
                            min={1}
                            max={500}
                            className="w-16 px-2 py-1 bg-gray-700 rounded text-sm text-center"
                            placeholder="Reps"
                          />
                          <span className="text-gray-500 text-sm">reps</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {index > 0 && (
                          <button
                            onClick={() => moveExercise(index, index - 1)}
                            className="p-1.5 hover:bg-gray-700 rounded text-gray-400"
                          >
                            <ChevronDown className="w-4 h-4 rotate-180" />
                          </button>
                        )}
                        {index < template.exercises.length - 1 && (
                          <button
                            onClick={() => moveExercise(index, index + 1)}
                            className="p-1.5 hover:bg-gray-700 rounded text-gray-400"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => removeExercise(index)}
                          className="p-1.5 hover:bg-gray-700 rounded text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Public toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Make Public</p>
                <p className="text-xs text-gray-500">Allow others to discover and clone this template</p>
              </div>
              <button
                onClick={() => onChange({ ...template, isPublic: !template.isPublic })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  template.isPublic ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    template.isPublic ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-800">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
