import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Filter: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>,
  Dumbbell: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7"/></svg>,
  Clock: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Target: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
};

const DIFFICULTY_LABELS = {
  1: { label: 'Beginner', color: 'text-emerald-400 bg-emerald-500/20' },
  2: { label: 'Easy', color: 'text-teal-400 bg-teal-500/20' },
  3: { label: 'Moderate', color: 'text-amber-400 bg-amber-500/20' },
  4: { label: 'Hard', color: 'text-orange-400 bg-orange-500/20' },
  5: { label: 'Expert', color: 'text-rose-400 bg-rose-500/20' },
};

const EXERCISE_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'strength', label: 'Strength' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'plyometric', label: 'Plyometric' },
];

const ExerciseCard = ({ exercise, onClick }) => {
  const difficulty = DIFFICULTY_LABELS[exercise.difficulty] || DIFFICULTY_LABELS[2];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(exercise)}
      className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-white">{exercise.name}</h3>
        <span className={clsx('text-xs px-2 py-0.5 rounded-full', difficulty.color)}>
          {difficulty.label}
        </span>
      </div>

      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
        {exercise.description || 'No description available'}
      </p>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Icons.Clock />
          <span>{exercise.estimatedSeconds || 45}s</span>
        </div>
        {exercise.isCompound && (
          <div className="flex items-center gap-1">
            <Icons.Target />
            <span>Compound</span>
          </div>
        )}
        {exercise.primaryMuscles?.length > 0 && (
          <div className="text-gray-400">
            {exercise.primaryMuscles.slice(0, 2).join(', ')}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ExerciseModal = ({ exercise, onClose }) => {
  if (!exercise) return null;

  const difficulty = DIFFICULTY_LABELS[exercise.difficulty] || DIFFICULTY_LABELS[2];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{exercise.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={clsx('text-xs px-2 py-0.5 rounded-full', difficulty.color)}>
                  {difficulty.label}
                </span>
                <span className="text-xs text-gray-500 capitalize">{exercise.type}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {exercise.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Description</h3>
                <p className="text-white">{exercise.description}</p>
              </div>
            )}

            {exercise.cues && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Cues</h3>
                <p className="text-white">{exercise.cues}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Duration</div>
                <div className="text-white font-medium">{exercise.estimatedSeconds || 45}s</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Rest</div>
                <div className="text-white font-medium">{exercise.restSeconds || 60}s</div>
              </div>
            </div>

            {exercise.primaryMuscles?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Primary Muscles</h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.primaryMuscles.map(muscle => (
                    <span key={muscle} className="px-2 py-1 bg-violet-500/20 text-violet-400 rounded-lg text-xs">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {exercise.equipmentRequired?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Equipment Required</h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.equipmentRequired.map(eq => (
                    <span key={eq} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {exercise.locations?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Available Locations</h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.locations.map(loc => (
                    <span key={loc} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs capitalize">
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function Exercises() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch('/api/exercises')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setExercises(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = !search ||
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.description?.toLowerCase().includes(search.toLowerCase()) ||
      ex.primaryMuscles?.some(m => m.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === 'all' || ex.type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-all">
              <Icons.Back />
            </Link>
            <h1 className="font-semibold text-lg">Exercise Library</h1>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'p-2 rounded-lg transition-all',
              showFilters ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-white/10'
            )}
          >
            <Icons.Filter />
          </button>
        </div>
      </header>

      <main className="pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Search */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Icons.Search />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises, muscles..."
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all"
            />
          </div>

          {/* Type Filter */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="flex flex-wrap gap-2 pb-2">
                  {EXERCISE_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={clsx(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        selectedType === type.id
                          ? 'bg-violet-500 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          <div className="text-sm text-gray-500 mb-4">
            {loading ? 'Loading...' : `${filteredExercises.length} exercises`}
          </div>

          {/* Exercise Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-12">
              <Icons.Dumbbell />
              <p className="text-gray-400 mt-2">No exercises found</p>
              <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExercises.map(exercise => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onClick={setSelectedExercise}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Exercise Detail Modal */}
      <AnimatePresence>
        {selectedExercise && (
          <ExerciseModal
            exercise={selectedExercise}
            onClose={() => setSelectedExercise(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
