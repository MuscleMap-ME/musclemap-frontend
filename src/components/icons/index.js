/**
 * MuscleMap Icon System
 *
 * A unified icon library combining:
 * - Lucide React (general UI icons)
 * - Phosphor Icons (fitness-focused with weight variants)
 * - DiceBear Avatars (user profile generation)
 * - Custom Fitness Icons (muscle groups, equipment, metrics)
 *
 * Usage:
 *
 * ```jsx
 * // Import unified Icon component
 * import Icon from '@/components/icons';
 *
 * // Use with name prop
 * <Icon name="dumbbell" size="lg" color="primary" />
 *
 * // Or import specific icons
 * import { Dumbbell, Heart, Trophy } from '@/components/icons';
 *
 * // Use avatars
 * import { Avatar, AvatarGroup } from '@/components/icons';
 * <Avatar seed={userId} style="avataaars" size="lg" />
 *
 * // Use custom fitness icons
 * import { MuscleChest, EquipmentBarbell } from '@/components/icons';
 * ```
 */

// Main Icon component
export { default as Icon } from './Icon';

// Theme configuration
export {
  default as iconTheme,
  iconSizes,
  iconWeights,
  iconColors,
  defaultIconProps,
  iconWrapperStyles,
  getIconSize,
  getIconColor,
  getIconWeight,
} from './iconTheme';

// Avatar components
export {
  default as Avatar,
  AvatarWithStatus,
  AvatarGroup,
  EditableAvatar,
  getAvatarUrl,
  availableStyles as avatarStyles,
  avatarSizes,
} from './Avatar';

// Re-export Lucide icons (most commonly used)
export {
  // Navigation
  Home,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ExternalLink,

  // Actions
  Plus,
  Minus,
  Check,
  Search,
  Filter,
  Settings,
  Edit,
  Trash2,
  Copy,
  Share2,
  Download,
  Upload,
  RefreshCw,
  MoreHorizontal,
  MoreVertical,

  // User & Social
  User,
  Users,
  UserPlus,
  UserCheck,
  Heart,
  Star,
  ThumbsUp,
  MessageCircle,
  Bell,
  Mail,

  // Fitness & Health
  Activity,
  Flame,
  Timer,
  Clock,
  Calendar,
  Target,
  Trophy,
  Award,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Dumbbell,
  Bike,
  Footprints,
  HeartPulse,
  Brain,

  // Media
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Camera,
  Image,
  Video,

  // Status & Feedback
  Info,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Loader2,

  // Misc
  Sun,
  Moon,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  LogIn,
  LogOut,
  Sparkles,
  Crown,
  Bookmark,
  BookmarkCheck,
  Map,
  MapPin,
  Compass,
  Send,
  Maximize2,
  Minimize2,
  Grid,
  List,
  LayoutGrid,
  Grip,
} from './Icon';

// Re-export Phosphor icons (fitness-focused)
export {
  PhBarbell,
  PhRun,
  PhWalk,
  PhBike,
  PhSwim,
  PhHeartbeat,
  PhFire,
  PhLightning,
  PhTrophy,
  PhMedal,
  PhTarget,
  PhChartLineUp,
  PhTimer,
  PhClock,
  PhCalendar,
  PhScales,
  PhRuler,
  PhDrop,
  PhPulse,
  PhFirstAid,
  PhStethoscope,
  PhPill,
  PhApple,
  PhCoffee,
  PhForkKnife,
  PhFlame,
} from './Icon';

// Custom Fitness Icons
export {
  // Muscle groups
  MuscleChest,
  MuscleBack,
  MuscleShoulders,
  MuscleArms,
  MuscleBicep,
  MuscleLegs,
  MuscleCore,
  MuscleGlutes,

  // Exercise types
  ExercisePush,
  ExercisePull,
  ExerciseSquat,
  ExerciseCardio,
  ExerciseStretch,

  // Equipment
  EquipmentBarbell,
  EquipmentDumbbell,
  EquipmentKettlebell,
  EquipmentBand,
  EquipmentMat,
  EquipmentTreadmill,

  // Metrics
  MetricReps,
  MetricSets,
  MetricWeight,
  MetricTime,
  MetricDistance,
  MetricCalories,

  // Body composition
  BodyFat,
  BodyMuscle,
  BodyScale,

  // Workout status
  WorkoutActive,
  WorkoutRest,
  WorkoutComplete,
  WorkoutSkipped,

  // Default export for all fitness icons
  default as FitnessIcons,
} from './FitnessIcons';

// Default export is the Icon component
export { default } from './Icon';
