/**
 * Onboarding Store
 *
 * Manages onboarding state across screens using Zustand.
 * Stores preferences temporarily until completion, then syncs to server.
 */
import { create } from 'zustand';

type UnitSystem = 'metric' | 'imperial';
type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';

interface OnboardingState {
  // Unit preferences
  preferredUnits: UnitSystem;

  // Physical profile
  gender: Gender | null;
  dateOfBirth: string | null;
  heightCm: number | null;
  heightFt: number | null;
  heightIn: number | null;
  weightKg: number | null;
  weightLbs: number | null;

  // Home equipment
  homeEquipment: string[];

  // Actions
  setPreferredUnits: (units: UnitSystem) => void;
  setGender: (gender: Gender | null) => void;
  setDateOfBirth: (dob: string | null) => void;
  setHeightMetric: (cm: number | null) => void;
  setHeightImperial: (ft: number | null, inches: number | null) => void;
  setWeightMetric: (kg: number | null) => void;
  setWeightImperial: (lbs: number | null) => void;
  setHomeEquipment: (equipmentIds: string[]) => void;
  toggleEquipment: (equipmentId: string) => void;
  reset: () => void;

  // Derived getters
  getPhysicalProfile: () => {
    gender: Gender | null;
    dateOfBirth: string | null;
    heightCm: number | null;
    heightFt: number | null;
    heightIn: number | null;
    weightKg: number | null;
    weightLbs: number | null;
    preferredUnits: UnitSystem;
  };
}

const initialState = {
  preferredUnits: 'metric' as UnitSystem,
  gender: null,
  dateOfBirth: null,
  heightCm: null,
  heightFt: null,
  heightIn: null,
  weightKg: null,
  weightLbs: null,
  homeEquipment: [] as string[],
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...initialState,

  setPreferredUnits: (units) => set({ preferredUnits: units }),

  setGender: (gender) => set({ gender }),

  setDateOfBirth: (dob) => set({ dateOfBirth: dob }),

  setHeightMetric: (cm) => {
    if (cm === null) {
      set({ heightCm: null, heightFt: null, heightIn: null });
      return;
    }
    // Convert cm to ft/in
    const totalInches = cm / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inches = Math.round((totalInches % 12) * 10) / 10;
    set({ heightCm: cm, heightFt: ft, heightIn: inches });
  },

  setHeightImperial: (ft, inches) => {
    if (ft === null && inches === null) {
      set({ heightCm: null, heightFt: null, heightIn: null });
      return;
    }
    // Convert ft/in to cm
    const totalInches = (ft || 0) * 12 + (inches || 0);
    const cm = Math.round(totalInches * 2.54 * 10) / 10;
    set({ heightCm: cm, heightFt: ft, heightIn: inches });
  },

  setWeightMetric: (kg) => {
    if (kg === null) {
      set({ weightKg: null, weightLbs: null });
      return;
    }
    // Convert kg to lbs
    const lbs = Math.round(kg * 2.20462 * 10) / 10;
    set({ weightKg: kg, weightLbs: lbs });
  },

  setWeightImperial: (lbs) => {
    if (lbs === null) {
      set({ weightKg: null, weightLbs: null });
      return;
    }
    // Convert lbs to kg
    const kg = Math.round((lbs / 2.20462) * 10) / 10;
    set({ weightKg: kg, weightLbs: lbs });
  },

  setHomeEquipment: (equipmentIds) => set({ homeEquipment: equipmentIds }),

  toggleEquipment: (equipmentId) => {
    const current = get().homeEquipment;
    if (current.includes(equipmentId)) {
      set({ homeEquipment: current.filter((id) => id !== equipmentId) });
    } else {
      set({ homeEquipment: [...current, equipmentId] });
    }
  },

  reset: () => set(initialState),

  getPhysicalProfile: () => {
    const state = get();
    return {
      gender: state.gender,
      dateOfBirth: state.dateOfBirth,
      heightCm: state.heightCm,
      heightFt: state.heightFt,
      heightIn: state.heightIn,
      weightKg: state.weightKg,
      weightLbs: state.weightLbs,
      preferredUnits: state.preferredUnits,
    };
  },
}));
