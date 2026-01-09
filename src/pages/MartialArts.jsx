import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';

// Difficulty stars display
const DifficultyStars = ({ difficulty }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={star <= difficulty ? 'text-yellow-400' : 'text-gray-600'}
      >
        ★
      </span>
    ))}
  </div>
);

// Status badge with color
const StatusBadge = ({ status }) => {
  const colors = {
    locked: 'bg-gray-700 text-gray-400',
    available: 'bg-blue-600 text-white',
    learning: 'bg-yellow-600 text-white',
    proficient: 'bg-purple-600 text-white',
    mastered: 'bg-green-600 text-white',
  };
  const labels = {
    locked: '🔒 Locked',
    available: '✨ Available',
    learning: '🔥 Learning',
    proficient: '💪 Proficient',
    mastered: '🏆 Mastered',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.locked}`}>
      {labels[status] || status}
    </span>
  );
};

// Proficiency bar
const ProficiencyBar = ({ proficiency }) => (
  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
    <div
      className={`h-full transition-all ${
        proficiency >= 80 ? 'bg-green-500' : proficiency >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
      }`}
      style={{ width: `${proficiency}%` }}
    />
  </div>
);

// Technique card component
const TechniqueCard = ({ technique, onClick }) => {
  const status = technique.progress?.status || 'locked';
  const isLocked = status === 'locked';
  const proficiency = technique.progress?.proficiency || 0;

  return (
    <button
      onClick={() => !isLocked && onClick(technique)}
      disabled={isLocked}
      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
        isLocked
          ? 'bg-gray-800/50 border-gray-700 opacity-60 cursor-not-allowed'
          : status === 'mastered'
          ? 'bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-600 hover:border-green-500'
          : status === 'proficient'
          ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-600 hover:border-purple-500'
          : status === 'learning'
          ? 'bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border-yellow-600 hover:border-yellow-500'
          : 'bg-gray-800 border-gray-600 hover:border-blue-500 hover:bg-gray-700'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-white">{technique.name}</h3>
        <StatusBadge status={status} />
      </div>
      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{technique.description}</p>
      <div className="flex items-center justify-between mb-2">
        <DifficultyStars difficulty={technique.difficulty} />
        <span className="text-xs text-gray-500 capitalize">{technique.category}</span>
      </div>
      {status !== 'locked' && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Proficiency</span>
            <span>{proficiency}%</span>
          </div>
          <ProficiencyBar proficiency={proficiency} />
        </div>
      )}
    </button>
  );
};

// Technique detail modal
const TechniqueDetailModal = ({ technique, onClose, onLogPractice, onMaster }) => {
  const [practiceMinutes, setPracticeMinutes] = useState(15);
  const [repsPerformed, setRepsPerformed] = useState('');
  const [roundsPerformed, setRoundsPerformed] = useState('');
  const [partnerDrill, setPartnerDrill] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogPractice = async () => {
    setSubmitting(true);
    await onLogPractice({
      techniqueId: technique.id,
      durationMinutes: practiceMinutes,
      repsPerformed: repsPerformed ? parseInt(repsPerformed) : undefined,
      roundsPerformed: roundsPerformed ? parseInt(roundsPerformed) : undefined,
      partnerDrill,
      notes: notes || undefined,
    });
    setSubmitting(false);
    onClose();
  };

  const handleMaster = async () => {
    setSubmitting(true);
    await onMaster({ techniqueId: technique.id });
    setSubmitting(false);
    onClose();
  };

  const status = technique.progress?.status || 'available';
  const proficiency = technique.progress?.proficiency || 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{technique.name}</h2>
              <StatusBadge status={status} />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
              ×
            </button>
          </div>

          <p className="text-gray-300 mb-4">{technique.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Difficulty</div>
              <DifficultyStars difficulty={technique.difficulty} />
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Category</div>
              <div className="text-white font-medium capitalize">{technique.category}</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">XP Reward</div>
              <div className="text-green-400 font-medium">+{technique.xpReward} XP</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Credit Reward</div>
              <div className="text-yellow-400 font-medium">+{technique.creditReward} 💰</div>
            </div>
          </div>

          {/* Proficiency */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Proficiency</span>
              <span>{proficiency}%</span>
            </div>
            <ProficiencyBar proficiency={proficiency} />
            {proficiency >= 80 && status !== 'mastered' && (
              <div className="text-green-400 text-sm mt-2">Ready to master!</div>
            )}
          </div>

          {technique.keyPoints?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-2">Key Points</h3>
              <ul className="space-y-2">
                {technique.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300">
                    <span className="text-green-400">✓</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {technique.muscleGroups?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-2">Muscles Used</h3>
              <div className="flex flex-wrap gap-2">
                {technique.muscleGroups.map((muscle, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300 capitalize"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
          )}

          {status !== 'mastered' && (
            <>
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-lg font-bold text-white mb-4">Log Practice</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={practiceMinutes}
                      onChange={(e) => setPracticeMinutes(parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
                      min="1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Reps performed</label>
                      <input
                        type="number"
                        value={repsPerformed}
                        onChange={(e) => setRepsPerformed(e.target.value)}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Rounds</label>
                      <input
                        type="number"
                        value={roundsPerformed}
                        onChange={(e) => setRoundsPerformed(e.target.value)}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="partnerDrill"
                      checked={partnerDrill}
                      onChange={(e) => setPartnerDrill(e.target.checked)}
                      className="w-5 h-5 rounded bg-gray-700"
                    />
                    <label htmlFor="partnerDrill" className="text-gray-300">
                      Partner drill / sparring
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white resize-none"
                      rows={2}
                      placeholder="How did it go?"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleLogPractice}
                      disabled={submitting || practiceMinutes < 1}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Log Practice'}
                    </button>
                    {proficiency >= 80 && (
                      <button
                        onClick={handleMaster}
                        disabled={submitting}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                      >
                        🏆 Mark Mastered!
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {status === 'mastered' && (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">🏆</div>
              <div className="text-green-400 font-bold text-lg">Technique Mastered!</div>
              {technique.progress?.masteredAt && (
                <div className="text-gray-400 text-sm mt-2">
                  Mastered on {new Date(technique.progress.masteredAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Discipline view with techniques
const DisciplineView = ({ discipline, techniques, onLogPractice, onMaster }) => {
  const [selectedTechnique, setSelectedTechnique] = useState(null);

  // Group techniques by category
  const categories = {};
  techniques.forEach((tech) => {
    const categoryId = tech.categoryId || 'uncategorized';
    if (!categories[categoryId]) categories[categoryId] = [];
    categories[categoryId].push(tech);
  });

  return (
    <div>
      <div
        className={`rounded-xl p-4 mb-6 bg-gradient-to-r ${discipline.color || 'from-red-500 to-orange-500'}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-4xl">{discipline.icon}</span>
          <div>
            <h2 className="text-2xl font-bold text-white">{discipline.name}</h2>
            <p className="text-white/80">{discipline.description}</p>
            {discipline.isMilitary && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-black/30 rounded text-xs text-white/90">
                Military/Tactical
              </span>
            )}
          </div>
        </div>
      </div>

      {discipline.categories?.map((cat) => {
        const catTechniques = categories[cat.id] || [];
        if (catTechniques.length === 0) return null;

        return (
          <div key={cat.id} className="mb-8">
            <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
              <span className="bg-gray-700 px-3 py-1 rounded-full text-sm">{cat.name}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catTechniques
                .sort((a, b) => a.tier - b.tier || a.position - b.position)
                .map((tech) => (
                  <TechniqueCard key={tech.id} technique={tech} onClick={setSelectedTechnique} />
                ))}
            </div>
          </div>
        );
      })}

      {/* Uncategorized techniques */}
      {categories['uncategorized']?.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-300 mb-4">Other Techniques</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories['uncategorized'].map((tech) => (
              <TechniqueCard key={tech.id} technique={tech} onClick={setSelectedTechnique} />
            ))}
          </div>
        </div>
      )}

      {selectedTechnique && (
        <TechniqueDetailModal
          technique={selectedTechnique}
          onClose={() => setSelectedTechnique(null)}
          onLogPractice={onLogPractice}
          onMaster={onMaster}
        />
      )}
    </div>
  );
};

// Summary card
const ProgressSummaryCard = ({ summary }) => {
  if (!summary) return null;

  const percent =
    summary.totalTechniques > 0
      ? Math.round((summary.masteredTechniques / summary.totalTechniques) * 100)
      : 0;

  return (
    <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-xl p-6 mb-6">
      <h2 className="text-xl font-bold text-white mb-4">Your Martial Arts Progress</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400">{summary.masteredTechniques}</div>
          <div className="text-gray-400 text-sm">Mastered</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-400">{summary.learningTechniques}</div>
          <div className="text-gray-400 text-sm">Learning</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400">{summary.availableTechniques}</div>
          <div className="text-gray-400 text-sm">Available</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-400">
            {Math.floor(summary.totalPracticeMinutes / 60)}h
          </div>
          <div className="text-gray-400 text-sm">Training Time</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Overall Mastery</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-orange-400 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Main component
export default function MartialArts() {
  const { disciplineId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [disciplines, setDisciplines] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const [techniques, setTechniques] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMilitaryOnly, setShowMilitaryOnly] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  // Load disciplines
  useEffect(() => {
    const url = showMilitaryOnly
      ? '/api/martial-arts/disciplines?military=true'
      : '/api/martial-arts/disciplines';

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setDisciplines(data.disciplines || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [showMilitaryOnly]);

  // Load summary when authenticated
  useEffect(() => {
    if (!token) return;
    fetch('/api/martial-arts/progress', { headers })
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => {});
  }, [token]);

  // Load discipline details when disciplineId changes
  useEffect(() => {
    if (!disciplineId) {
      setSelectedDiscipline(null);
      setTechniques([]);
      return;
    }

    setLoading(true);
    Promise.all([
      fetch(`/api/martial-arts/disciplines/${disciplineId}`).then((r) => r.json()),
      token
        ? fetch(`/api/martial-arts/disciplines/${disciplineId}/progress`, { headers }).then((r) =>
            r.json()
          )
        : fetch(`/api/martial-arts/disciplines/${disciplineId}/techniques`).then((r) => r.json()),
    ])
      .then(([disciplineData, techniquesData]) => {
        setSelectedDiscipline(disciplineData.discipline);
        setTechniques(techniquesData.techniques || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [disciplineId, token]);

  // Log practice handler
  const handleLogPractice = async (data) => {
    if (!token) {
      alert('Please log in to track your progress');
      return;
    }
    try {
      const res = await fetch('/api/martial-arts/practice', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.practiceLog) {
        // Refresh progress
        const progressRes = await fetch(`/api/martial-arts/disciplines/${disciplineId}/progress`, {
          headers,
        });
        const progressData = await progressRes.json();
        setTechniques(progressData.techniques || []);
        // Refresh summary
        const summaryRes = await fetch('/api/martial-arts/progress', { headers });
        setSummary(await summaryRes.json());
      }
    } catch (err) {
      alert('Failed to log practice');
    }
  };

  // Master technique handler
  const handleMaster = async (data) => {
    if (!token) {
      alert('Please log in to track your progress');
      return;
    }
    try {
      const res = await fetch('/api/martial-arts/master', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        alert(`🏆 Technique mastered! +${result.creditsAwarded} credits, +${result.xpAwarded} XP`);
        // Refresh progress
        const progressRes = await fetch(`/api/martial-arts/disciplines/${disciplineId}/progress`, {
          headers,
        });
        const progressData = await progressRes.json();
        setTechniques(progressData.techniques || []);
        // Refresh summary
        const summaryRes = await fetch('/api/martial-arts/progress', { headers });
        setSummary(await summaryRes.json());
      } else {
        alert(result.error || 'Failed to master technique');
      }
    } catch (err) {
      alert('Failed to master technique');
    }
  };

  if (loading && !disciplines.length) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🥊</div>
          <div>Loading martial arts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <header className="bg-gray-800 p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to={disciplineId ? '/martial-arts' : '/dashboard'} className="text-blue-400">
            ← {disciplineId ? 'All Disciplines' : 'Back'}
          </Link>
          <h1 className="text-xl font-bold">
            {selectedDiscipline ? selectedDiscipline.name : 'Martial Arts'}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-4">{error}</div>
        )}

        {!disciplineId ? (
          <>
            {/* Summary */}
            {token && <ProgressSummaryCard summary={summary} />}

            {/* Filter toggle */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Disciplines</h2>
              <button
                onClick={() => setShowMilitaryOnly(!showMilitaryOnly)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showMilitaryOnly
                    ? 'bg-green-700 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {showMilitaryOnly ? '🪖 Military Only' : 'All Disciplines'}
              </button>
            </div>

            <p className="text-gray-400 mb-6">
              Learn combat techniques from boxing to BJJ, including military combatives programs
              like MCMAP and Krav Maga. Track your progress and master each discipline.
            </p>

            {/* Discipline grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {disciplines.map((discipline) => (
                <button
                  key={discipline.id}
                  onClick={() => navigate(`/martial-arts/${discipline.id}`)}
                  className={`p-6 rounded-xl text-left transition-all hover:scale-[1.02] bg-gradient-to-br ${
                    discipline.color || 'from-red-500 to-orange-500'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{discipline.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold text-white">{discipline.name}</h3>
                      {discipline.isMilitary && (
                        <span className="text-xs bg-black/30 px-2 py-0.5 rounded">Military</span>
                      )}
                    </div>
                  </div>
                  <p className="text-white/80 text-sm mb-3">{discipline.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {discipline.focusAreas?.map((area, i) => (
                      <span
                        key={i}
                        className="text-xs bg-black/20 px-2 py-0.5 rounded text-white/70 capitalize"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {/* Info section */}
            <div className="mt-12 bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">How It Works</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl mb-2">🥊</div>
                  <h4 className="font-bold text-white mb-1">Choose a Discipline</h4>
                  <p className="text-gray-400 text-sm">
                    Select from boxing, BJJ, wrestling, and military combatives. Each has unique
                    techniques to master.
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-2">📈</div>
                  <h4 className="font-bold text-white mb-1">Build Proficiency</h4>
                  <p className="text-gray-400 text-sm">
                    Log your practice sessions to increase proficiency. Partner drills and
                    repetitions all count toward mastery.
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-2">🏆</div>
                  <h4 className="font-bold text-white mb-1">Master Techniques</h4>
                  <p className="text-gray-400 text-sm">
                    Reach 80% proficiency to unlock mastery. Earn credits and XP as you progress
                    through each discipline.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Summary */}
            {token && <ProgressSummaryCard summary={summary} />}

            {/* Discipline view */}
            {selectedDiscipline && (
              <DisciplineView
                discipline={selectedDiscipline}
                techniques={techniques}
                onLogPractice={handleLogPractice}
                onMaster={handleMaster}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
