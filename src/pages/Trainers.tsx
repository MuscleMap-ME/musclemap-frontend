/**
 * Trainers Page
 *
 * Browse trainers, manage trainer profile, create/manage classes.
 * Uses GraphQL for all data operations.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '../store';
import {
  TRAINERS_QUERY,
  MY_TRAINER_PROFILE_QUERY,
  UPCOMING_CLASSES_QUERY,
  MY_TRAINER_CLASSES_QUERY,
  MY_CLASS_ENROLLMENTS_QUERY,
} from '../graphql/queries';
import {
  UPSERT_TRAINER_PROFILE_MUTATION,
  CREATE_TRAINER_CLASS_MUTATION,
  ENROLL_IN_CLASS_MUTATION,
  UNENROLL_FROM_CLASS_MUTATION,
} from '../graphql/mutations';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
} from '../components/glass';

// ============================================
// TYPES
// ============================================
interface TrainerProfile {
  userId: string;
  displayName: string;
  bio: string | null;
  specialties: string[];
  certifications: string[];
  hourlyRateCredits: number;
  perClassRateCredits: number;
  verified: boolean;
  verifiedAt: string | null;
  ratingAvg: number;
  ratingCount: number;
  totalClassesTaught: number;
  totalStudentsTrained: number;
  totalCreditsEarned: number;
  status: string;
  createdAt: string;
}

interface TrainerClass {
  id: string;
  trainerUserId: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  startAt: string;
  durationMinutes: number;
  locationType: string;
  locationDetails: string | null;
  capacity: number;
  enrolledCount: number;
  creditsPerStudent: number;
  trainerWagePerStudent: number;
  status: string;
  createdAt: string;
}

interface ClassEnrollment {
  id: string;
  classId: string;
  userId: string;
  status: string;
  creditsPaid: number;
  enrolledAt: string;
  cancelledAt: string | null;
  class: TrainerClass;
}

interface TrainersData {
  trainers: {
    trainers: TrainerProfile[];
    total: number;
  };
}

interface MyTrainerProfileData {
  myTrainerProfile: TrainerProfile | null;
}

interface UpcomingClassesData {
  trainerClasses: {
    classes: TrainerClass[];
    total: number;
  };
}

interface MyTrainerClassesData {
  myTrainerClasses: {
    classes: TrainerClass[];
    total: number;
  };
}

interface MyEnrollmentsData {
  myClassEnrollments: {
    enrollments: ClassEnrollment[];
    total: number;
  };
}

// ============================================
// ICONS
// ============================================
const Icons = {
  User: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Calendar: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Users: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Clock: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  MapPin: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Star: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Plus: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
  ),
  X: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Coins: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Video: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Badge: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
};

// ============================================
// CLASS CARD COMPONENT
// ============================================
function ClassCard({
  classData,
  onEnroll,
  onCancel,
  isEnrolled,
  isTrainer,
}: {
  classData: TrainerClass;
  onEnroll?: () => void;
  onCancel?: () => void;
  isEnrolled?: boolean;
  isTrainer?: boolean;
}) {
  const startDate = new Date(classData.startAt);
  const isPast = startDate < new Date();
  const isFull = classData.enrolledCount >= classData.capacity;

  return (
    <GlassCard className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-bold text-lg">{classData.title}</h3>
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <span className="capitalize px-2 py-0.5 rounded bg-white/10">
              {classData.difficulty}
            </span>
            <span>{classData.category}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-amber-400">
            <Icons.Coins className="w-4 h-4" />
            <span className="font-bold">{classData.creditsPerStudent}</span>
          </div>
        </div>
      </div>

      <p className="text-white/60 text-sm mb-4 line-clamp-2">
        {classData.description || 'No description provided'}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2 text-white/60">
          <Icons.Calendar className="w-4 h-4" />
          <span>{startDate.toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <Icons.Clock className="w-4 h-4" />
          <span>{startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <Icons.Users className="w-4 h-4" />
          <span>{classData.enrolledCount || 0}/{classData.capacity}</span>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          {classData.locationType === 'virtual' ? (
            <Icons.Video className="w-4 h-4" />
          ) : (
            <Icons.MapPin className="w-4 h-4" />
          )}
          <span className="capitalize">{classData.locationType.replace('_', ' ')}</span>
        </div>
      </div>

      {!isTrainer && (
        <div className="flex gap-2">
          {isEnrolled ? (
            <GlassButton
              onClick={onCancel}
              className="flex-1 text-red-400 border-red-400/30"
            >
              Cancel Enrollment
            </GlassButton>
          ) : (
            <GlassButton
              onClick={onEnroll}
              disabled={isPast || isFull}
              className={`flex-1 ${isPast || isFull ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isPast ? 'Past Class' : isFull ? 'Class Full' : 'Enroll'}
            </GlassButton>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ============================================
// TRAINER CARD COMPONENT
// ============================================
function TrainerCard({
  trainer,
  onSelect,
}: {
  trainer: TrainerProfile;
  onSelect: (trainer: TrainerProfile) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="cursor-pointer"
      onClick={() => onSelect(trainer)}
    >
      <GlassCard className="p-4 hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-2xl">
            {trainer.displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold">{trainer.displayName}</h3>
              {trainer.verified && (
                <Icons.Badge className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-white/50">
              {trainer.ratingAvg > 0 && (
                <div className="flex items-center gap-1">
                  <Icons.Star className="w-3 h-3 text-amber-400" />
                  <span>{trainer.ratingAvg.toFixed(1)}</span>
                </div>
              )}
              {trainer.totalClassesTaught > 0 && (
                <span>{trainer.totalClassesTaught} classes</span>
              )}
            </div>
            {trainer.specialties?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {trainer.specialties.slice(0, 3).map((s, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right text-sm">
            {trainer.perClassRateCredits > 0 && (
              <div className="flex items-center gap-1 text-amber-400">
                <Icons.Coins className="w-4 h-4" />
                <span>{trainer.perClassRateCredits}/class</span>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ============================================
// MAIN TRAINERS PAGE
// ============================================
export default function Trainers() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerProfile | null>(null);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    specialties: [] as string[],
    certifications: [] as string[],
    perClassRateCredits: 50,
  });
  const [classForm, setClassForm] = useState({
    title: '',
    description: '',
    category: 'fitness',
    difficulty: 'all',
    startAt: '',
    durationMinutes: 60,
    locationType: 'virtual',
    capacity: 20,
    creditsPerStudent: 50,
  });
  const [newSpecialty, setNewSpecialty] = useState('');

  // GraphQL Queries
  const { data: trainersData, loading: loadingTrainers } = useQuery<TrainersData>(TRAINERS_QUERY, {
    variables: { limit: 50 },
    fetchPolicy: 'cache-and-network',
  });

  const { data: profileData, loading: loadingProfile, refetch: refetchProfile } = useQuery<MyTrainerProfileData>(
    MY_TRAINER_PROFILE_QUERY,
    {
      skip: !isAuthenticated,
      fetchPolicy: 'cache-and-network',
      onCompleted: (data) => {
        if (data?.myTrainerProfile) {
          setProfileForm({
            displayName: data.myTrainerProfile.displayName || '',
            bio: data.myTrainerProfile.bio || '',
            specialties: data.myTrainerProfile.specialties || [],
            certifications: data.myTrainerProfile.certifications || [],
            perClassRateCredits: data.myTrainerProfile.perClassRateCredits || 50,
          });
        }
      },
    }
  );

  const { data: classesData, loading: loadingClasses, refetch: refetchClasses } = useQuery<UpcomingClassesData>(
    UPCOMING_CLASSES_QUERY,
    {
      variables: { limit: 50 },
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: myClassesData, loading: loadingMyClasses, refetch: refetchMyClasses } = useQuery<MyTrainerClassesData>(
    MY_TRAINER_CLASSES_QUERY,
    {
      skip: !isAuthenticated || !profileData?.myTrainerProfile,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: enrollmentsData, loading: loadingEnrollments, refetch: refetchEnrollments } = useQuery<MyEnrollmentsData>(
    MY_CLASS_ENROLLMENTS_QUERY,
    {
      skip: !isAuthenticated,
      variables: { limit: 50 },
      fetchPolicy: 'cache-and-network',
    }
  );

  // GraphQL Mutations
  const [upsertProfile, { loading: creatingProfile }] = useMutation(UPSERT_TRAINER_PROFILE_MUTATION, {
    onCompleted: () => {
      refetchProfile();
      setShowCreateProfile(false);
    },
    onError: (err) => setError(err.message),
  });

  const [createClass, { loading: creatingClass }] = useMutation(CREATE_TRAINER_CLASS_MUTATION, {
    onCompleted: () => {
      refetchClasses();
      refetchMyClasses();
      setShowCreateClass(false);
      setClassForm({
        title: '',
        description: '',
        category: 'fitness',
        difficulty: 'all',
        startAt: '',
        durationMinutes: 60,
        locationType: 'virtual',
        capacity: 20,
        creditsPerStudent: 50,
      });
    },
    onError: (err) => setError(err.message),
  });

  const [enrollInClass] = useMutation(ENROLL_IN_CLASS_MUTATION, {
    onCompleted: () => {
      refetchClasses();
      refetchEnrollments();
    },
    onError: (err) => setError(err.message),
  });

  const [unenrollFromClass] = useMutation(UNENROLL_FROM_CLASS_MUTATION, {
    onCompleted: () => {
      refetchClasses();
      refetchEnrollments();
    },
    onError: (err) => setError(err.message),
  });

  // Memoized data
  const trainers = useMemo(() => trainersData?.trainers?.trainers || [], [trainersData]);
  const myProfile = useMemo(() => profileData?.myTrainerProfile || null, [profileData]);
  const classes = useMemo(() => classesData?.trainerClasses?.classes || [], [classesData]);
  const myClasses = useMemo(() => myClassesData?.myTrainerClasses?.classes || [], [myClassesData]);
  const enrollments = useMemo(() => enrollmentsData?.myClassEnrollments?.enrollments || [], [enrollmentsData]);

  // Handlers
  const handleEnroll = async (classId: string) => {
    await enrollInClass({ variables: { classId } });
  };

  const handleCancelEnrollment = async (classId: string) => {
    await unenrollFromClass({ variables: { classId } });
  };

  const handleCreateProfile = async () => {
    await upsertProfile({
      variables: {
        input: {
          displayName: profileForm.displayName,
          bio: profileForm.bio || undefined,
          specialties: profileForm.specialties,
          certifications: profileForm.certifications,
          perClassRateCredits: profileForm.perClassRateCredits,
        },
      },
    });
  };

  const handleCreateClass = async () => {
    const startAt = new Date(classForm.startAt).toISOString();
    await createClass({
      variables: {
        input: {
          title: classForm.title,
          description: classForm.description || undefined,
          category: classForm.category,
          difficulty: classForm.difficulty,
          startAt,
          durationMinutes: classForm.durationMinutes,
          locationType: classForm.locationType,
          capacity: classForm.capacity,
          creditsPerStudent: classForm.creditsPerStudent,
          trainerWagePerStudent: Math.floor(classForm.creditsPerStudent * 0.8),
        },
      },
    });
  };

  const addSpecialty = () => {
    if (newSpecialty && !profileForm.specialties.includes(newSpecialty)) {
      setProfileForm({
        ...profileForm,
        specialties: [...profileForm.specialties, newSpecialty],
      });
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setProfileForm({
      ...profileForm,
      specialties: profileForm.specialties.filter((s) => s !== specialty),
    });
  };

  const isEnrolled = (classId: string) => {
    return enrollments.some((e) => e.classId === classId && e.status === 'enrolled');
  };

  const loading = loadingTrainers || loadingProfile || loadingClasses;

  if (loading && !trainersData && !classesData) {
    return (
      <GlassSurface className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading trainers...</p>
        </div>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Trainers & Classes</h1>
            <p className="text-white/60">Find trainers, join classes, or become a trainer</p>
          </div>
          {myProfile ? (
            <GlassButton onClick={() => setShowCreateClass(true)}>
              <Icons.Plus className="w-4 h-4 mr-2" />
              Create Class
            </GlassButton>
          ) : (
            <GlassButton onClick={() => setShowCreateProfile(true)}>
              <Icons.User className="w-4 h-4 mr-2" />
              Become a Trainer
            </GlassButton>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-red-100">
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
          {['browse', 'classes', myProfile && 'my-classes', 'enrollments'].filter(Boolean).map((tab) => (
            <button
              key={tab as string}
              onClick={() => setActiveTab(tab as string)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {(tab as string).replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'browse' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Featured Trainers</h2>
            {trainers.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Icons.User className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No Trainers Yet</h3>
                <p className="text-white/60">Be the first to become a trainer!</p>
              </GlassCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {trainers.map((trainer) => (
                  <TrainerCard
                    key={trainer.userId}
                    trainer={trainer}
                    onSelect={setSelectedTrainer}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Upcoming Classes</h2>
            {classes.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Icons.Calendar className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No Classes Available</h3>
                <p className="text-white/60">Check back later for upcoming classes.</p>
              </GlassCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classes.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    classData={cls}
                    isEnrolled={isEnrolled(cls.id)}
                    onEnroll={() => handleEnroll(cls.id)}
                    onCancel={() => handleCancelEnrollment(cls.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-classes' && myProfile && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">My Classes</h2>
            {loadingMyClasses ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : myClasses.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Icons.Calendar className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No Classes Created</h3>
                <p className="text-white/60 mb-4">Create your first class to start teaching.</p>
                <GlassButton onClick={() => setShowCreateClass(true)}>
                  <Icons.Plus className="w-4 h-4 mr-2" />
                  Create Class
                </GlassButton>
              </GlassCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myClasses.map((cls) => (
                  <ClassCard key={cls.id} classData={cls} isTrainer />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'enrollments' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">My Enrollments</h2>
            {loadingEnrollments ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : enrollments.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Icons.Calendar className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No Enrollments</h3>
                <p className="text-white/60">Browse classes and enroll to get started.</p>
              </GlassCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {enrollments.map((enrollment) => (
                  <ClassCard
                    key={enrollment.id}
                    classData={enrollment.class}
                    isEnrolled
                    onCancel={() => handleCancelEnrollment(enrollment.classId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Profile Modal */}
        <AnimatePresence>
          {showCreateProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateProfile(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Become a Trainer</h2>
                    <button onClick={() => setShowCreateProfile(false)} className="text-white/50 hover:text-white">
                      <Icons.X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/70 text-sm mb-1">Display Name *</label>
                      <input
                        type="text"
                        value={profileForm.displayName}
                        onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        placeholder="Your trainer name"
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Bio</label>
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none resize-none"
                        placeholder="Tell students about yourself..."
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Specialties</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSpecialty}
                          onChange={(e) => setNewSpecialty(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                          placeholder="e.g., Yoga, HIIT"
                        />
                        <GlassButton onClick={addSpecialty}>Add</GlassButton>
                      </div>
                      {profileForm.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {profileForm.specialties.map((s, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-sm flex items-center gap-1"
                            >
                              {s}
                              <button onClick={() => removeSpecialty(s)} className="hover:text-white">
                                <Icons.X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Rate (credits per class)</label>
                      <input
                        type="number"
                        value={profileForm.perClassRateCredits}
                        onChange={(e) => setProfileForm({ ...profileForm, perClassRateCredits: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        min={0}
                      />
                    </div>

                    <GlassButton
                      onClick={handleCreateProfile}
                      disabled={!profileForm.displayName || creatingProfile}
                      className="w-full"
                    >
                      {creatingProfile ? 'Creating...' : 'Create Trainer Profile'}
                    </GlassButton>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Class Modal */}
        <AnimatePresence>
          {showCreateClass && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateClass(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Create Class</h2>
                    <button onClick={() => setShowCreateClass(false)} className="text-white/50 hover:text-white">
                      <Icons.X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/70 text-sm mb-1">Title *</label>
                      <input
                        type="text"
                        value={classForm.title}
                        onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        placeholder="Class title"
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Description</label>
                      <textarea
                        value={classForm.description}
                        onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none resize-none"
                        placeholder="What will students learn?"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/70 text-sm mb-1">Category</label>
                        <select
                          value={classForm.category}
                          onChange={(e) => setClassForm({ ...classForm, category: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        >
                          <option value="fitness">Fitness</option>
                          <option value="yoga">Yoga</option>
                          <option value="strength">Strength</option>
                          <option value="cardio">Cardio</option>
                          <option value="hiit">HIIT</option>
                          <option value="martial-arts">Martial Arts</option>
                          <option value="dance">Dance</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-white/70 text-sm mb-1">Difficulty</label>
                        <select
                          value={classForm.difficulty}
                          onChange={(e) => setClassForm({ ...classForm, difficulty: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        >
                          <option value="all">All Levels</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={classForm.startAt}
                        onChange={(e) => setClassForm({ ...classForm, startAt: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/70 text-sm mb-1">Duration (min)</label>
                        <input
                          type="number"
                          value={classForm.durationMinutes}
                          onChange={(e) => setClassForm({ ...classForm, durationMinutes: parseInt(e.target.value) || 60 })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                          min={5}
                          max={480}
                        />
                      </div>

                      <div>
                        <label className="block text-white/70 text-sm mb-1">Capacity</label>
                        <input
                          type="number"
                          value={classForm.capacity}
                          onChange={(e) => setClassForm({ ...classForm, capacity: parseInt(e.target.value) || 20 })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                          min={1}
                          max={1000}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/70 text-sm mb-1">Location Type</label>
                        <select
                          value={classForm.locationType}
                          onChange={(e) => setClassForm({ ...classForm, locationType: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                        >
                          <option value="virtual">Virtual</option>
                          <option value="in_person">In Person</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-white/70 text-sm mb-1">Price (credits)</label>
                        <input
                          type="number"
                          value={classForm.creditsPerStudent}
                          onChange={(e) => setClassForm({ ...classForm, creditsPerStudent: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                          min={0}
                        />
                      </div>
                    </div>

                    <GlassButton
                      onClick={handleCreateClass}
                      disabled={!classForm.title || !classForm.startAt || creatingClass}
                      className="w-full"
                    >
                      {creatingClass ? 'Creating...' : 'Create Class'}
                    </GlassButton>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trainer Detail Modal */}
        <AnimatePresence>
          {selectedTrainer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedTrainer(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Trainer Profile</h2>
                    <button onClick={() => setSelectedTrainer(null)} className="text-white/50 hover:text-white">
                      <Icons.X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-4xl mx-auto mb-4">
                      {selectedTrainer.displayName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-2xl font-bold text-white">{selectedTrainer.displayName}</h3>
                      {selectedTrainer.verified && (
                        <Icons.Badge className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    {selectedTrainer.ratingAvg > 0 && (
                      <div className="flex items-center justify-center gap-1 text-amber-400 mt-2">
                        <Icons.Star className="w-4 h-4" />
                        <span>{selectedTrainer.ratingAvg.toFixed(1)}</span>
                        <span className="text-white/50">({selectedTrainer.ratingCount || 0} reviews)</span>
                      </div>
                    )}
                  </div>

                  {selectedTrainer.bio && (
                    <div className="mb-6">
                      <h4 className="text-white/70 text-sm mb-2">About</h4>
                      <p className="text-white/80">{selectedTrainer.bio}</p>
                    </div>
                  )}

                  {selectedTrainer.specialties?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-white/70 text-sm mb-2">Specialties</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrainer.specialties.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-sm">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTrainer.certifications?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-white/70 text-sm mb-2">Certifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrainer.certifications.map((c, i) => (
                          <span key={i} className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-sm flex items-center gap-1">
                            <Icons.Badge className="w-3 h-3" />
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <GlassCard className="p-4 text-center">
                      <div className="text-2xl font-bold text-white">{selectedTrainer.totalClassesTaught || 0}</div>
                      <div className="text-white/50 text-sm">Classes Taught</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                      <div className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1">
                        <Icons.Coins className="w-5 h-5" />
                        {selectedTrainer.perClassRateCredits || 0}
                      </div>
                      <div className="text-white/50 text-sm">Per Class</div>
                    </GlassCard>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassSurface>
  );
}
