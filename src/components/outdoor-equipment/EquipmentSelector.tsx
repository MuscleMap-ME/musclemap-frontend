/**
 * EquipmentSelector Component
 *
 * Multi-select equipment type picker with category grouping.
 * Used in venue submission and filtering.
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import {
  Check,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Heart,
  Target,
  Zap,
  Move,
  Activity,
} from 'lucide-react';

const GET_EQUIPMENT_TYPES = gql`
  query GetEquipmentTypes {
    outdoorEquipmentTypes {
      id
      name
      slug
      category
      description
      iconName
      muscleGroups
    }
  }
`;

// Category icons
const categoryIcons: Record<string, React.ReactNode> = {
  upper_body: <Dumbbell className="w-4 h-4" />,
  core: <Target className="w-4 h-4" />,
  lower_body: <Move className="w-4 h-4" />,
  cardio: <Heart className="w-4 h-4" />,
  full_body: <Activity className="w-4 h-4" />,
  balance: <Zap className="w-4 h-4" />,
  flexibility: <Move className="w-4 h-4" />,
  multi: <Activity className="w-4 h-4" />,
  sports: <Target className="w-4 h-4" />,
  agility: <Zap className="w-4 h-4" />,
  plyometric: <Zap className="w-4 h-4" />,
};

// Category display names
const categoryNames: Record<string, string> = {
  upper_body: 'Upper Body',
  core: 'Core & Abs',
  lower_body: 'Lower Body',
  cardio: 'Cardio',
  full_body: 'Full Body',
  balance: 'Balance',
  flexibility: 'Flexibility',
  multi: 'Multi-Purpose',
  sports: 'Sports',
  agility: 'Agility',
  plyometric: 'Plyometric',
};

interface EquipmentType {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  iconName?: string;
  muscleGroups?: string[];
}

interface EquipmentSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  maxSelections?: number;
  showDescriptions?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

export function EquipmentSelector({
  value,
  onChange,
  className = '',
  maxSelections = 20,
  showDescriptions = true,
  compact = false,
  disabled = false,
}: EquipmentSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['upper_body', 'core']));

  const { data, loading, error } = useQuery(GET_EQUIPMENT_TYPES);

  // Group equipment by category
  const equipmentByCategory = useMemo(() => {
    if (!data?.outdoorEquipmentTypes) return {};

    const filtered = searchQuery
      ? data.outdoorEquipmentTypes.filter((type: EquipmentType) =>
          type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : data.outdoorEquipmentTypes;

    return filtered.reduce((acc: Record<string, EquipmentType[]>, type: EquipmentType) => {
      const category = type.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(type);
      return acc;
    }, {});
  }, [data, searchQuery]);

  // Category order
  const categoryOrder = [
    'upper_body',
    'core',
    'lower_body',
    'cardio',
    'full_body',
    'balance',
    'flexibility',
    'multi',
    'sports',
    'agility',
    'plyometric',
    'other',
  ];

  const sortedCategories = Object.keys(equipmentByCategory).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleEquipment = (equipmentId: string) => {
    if (disabled) return;

    if (value.includes(equipmentId)) {
      onChange(value.filter((id) => id !== equipmentId));
    } else if (value.length < maxSelections) {
      onChange([...value, equipmentId]);
    }
  };

  const selectAll = (category: string) => {
    if (disabled) return;

    const categoryIds = equipmentByCategory[category]?.map((e: EquipmentType) => e.id) || [];
    const newIds = categoryIds.filter((id: string) => !value.includes(id));
    if (value.length + newIds.length <= maxSelections) {
      onChange([...value, ...newIds]);
    }
  };

  const deselectAll = (category: string) => {
    if (disabled) return;

    const categoryIds = new Set(equipmentByCategory[category]?.map((e: EquipmentType) => e.id) || []);
    onChange(value.filter((id) => !categoryIds.has(id)));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded-lg mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 p-4 bg-red-50 rounded-lg ${className}`}>
        Failed to load equipment types. Please try again.
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Search and selection count */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search equipment..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            disabled={disabled}
          />
        </div>
        {value.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={disabled}
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Selection count */}
      <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
        <span>
          {value.length} selected {maxSelections < 20 && `(max ${maxSelections})`}
        </span>
        {value.length >= maxSelections && (
          <span className="text-orange-500 font-medium">Maximum reached</span>
        )}
      </div>

      {/* Equipment categories */}
      <div className={`space-y-2 ${compact ? 'max-h-64' : 'max-h-96'} overflow-y-auto`}>
        {sortedCategories.map((category) => {
          const types = equipmentByCategory[category];
          const isExpanded = expandedCategories.has(category);
          const selectedInCategory = types.filter((t: EquipmentType) => value.includes(t.id)).length;

          return (
            <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    {categoryIcons[category] || <Activity className="w-4 h-4" />}
                  </span>
                  <span className="font-medium text-gray-700">
                    {categoryNames[category] || category.replace(/_/g, ' ')}
                  </span>
                  {selectedInCategory > 0 && (
                    <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {selectedInCategory}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{types.length} items</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Equipment items */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  {/* Quick actions */}
                  <div className="flex justify-end gap-2 px-3 py-1 bg-gray-50 border-b border-gray-100">
                    <button
                      onClick={() => selectAll(category)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                      disabled={disabled}
                    >
                      Select all
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => deselectAll(category)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                      disabled={disabled}
                    >
                      Clear
                    </button>
                  </div>

                  {/* Items */}
                  <div className="p-2 grid grid-cols-1 gap-1">
                    {types.map((type: EquipmentType) => {
                      const isSelected = value.includes(type.id);
                      const isDisabled = disabled || (!isSelected && value.length >= maxSelections);

                      return (
                        <button
                          key={type.id}
                          onClick={() => toggleEquipment(type.id)}
                          disabled={isDisabled}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                            isSelected
                              ? 'bg-orange-50 border border-orange-200'
                              : 'bg-white hover:bg-gray-50 border border-transparent'
                          } ${isDisabled && !isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? 'bg-orange-500 border-orange-500'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-800">{type.name}</div>
                            {showDescriptions && type.description && (
                              <div className="text-xs text-gray-500 truncate">{type.description}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected tags (compact view) */}
      {!compact && value.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-500 mb-2">Selected Equipment:</div>
          <div className="flex flex-wrap gap-1">
            {value.map((id) => {
              const equipment = data?.outdoorEquipmentTypes?.find((e: EquipmentType) => e.id === id);
              if (!equipment) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full"
                >
                  {equipment.name}
                  <button
                    onClick={() => toggleEquipment(id)}
                    className="hover:text-orange-900"
                    disabled={disabled}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentSelector;
