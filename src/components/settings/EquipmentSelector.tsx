import React from 'react';

export interface EquipmentOption {
  /** Equipment identifier */
  id: string;
  /** Display name */
  name: string;
  /** Icon (emoji) */
  icon: string;
}

export interface EquipmentSelectorProps {
  /** Currently selected equipment IDs */
  selected: string[];
  /** Callback when selection changes */
  onChange: (selected: string[]) => void;
  /** Custom equipment options (uses defaults if not provided) */
  options?: EquipmentOption[];
  /** Optional title */
  title?: string;
  /** Optional className */
  className?: string;
}

const DEFAULT_EQUIPMENT: EquipmentOption[] = [
  { id: 'barbell', name: 'Barbell', icon: '🏋️' },
  { id: 'dumbbell', name: 'Dumbbells', icon: '💪' },
  { id: 'kettlebell', name: 'Kettlebell', icon: '🔔' },
  { id: 'cable', name: 'Cable Machine', icon: '🔗' },
  { id: 'machine', name: 'Machines', icon: '⚙️' },
  { id: 'bodyweight', name: 'Bodyweight', icon: '🤸' },
  { id: 'bands', name: 'Bands', icon: '〰️' },
  { id: 'pullupbar', name: 'Pull-up Bar', icon: '📏' },
];

/**
 * EquipmentSelector - Equipment availability selector with icon grid
 *
 * @example
 * <EquipmentSelector
 *   selected={['barbell', 'dumbbell']}
 *   onChange={(selected) => setEquipment(selected)}
 * />
 */
export const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({
  selected,
  onChange,
  options = DEFAULT_EQUIPMENT,
  title,
  className = '',
}) => {
  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className={className}>
      {title && (
        <label className="block text-sm font-medium text-slate-300 mb-3">
          {title}
        </label>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {options.map((eq) => {
          const isSelected = selected.includes(eq.id);
          return (
            <button
              key={eq.id}
              onClick={() => handleToggle(eq.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
              }`}
            >
              <span className="text-2xl block mb-2">{eq.icon}</span>
              <p className="font-medium text-sm">{eq.name}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EquipmentSelector;
