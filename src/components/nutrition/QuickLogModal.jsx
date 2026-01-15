/**
 * Quick Log Modal
 *
 * Bottom sheet modal for quickly logging food
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Camera,
  Barcode,
  Mic,
  Plus,
  Minus,
  Utensils,
  Coffee,
  Sun,
  Moon,
  Apple,
} from 'lucide-react';
import { GlassSurface } from '../glass/GlassSurface';
import { GlassButton } from '../glass/GlassButton';
import {
  useQuickLogOpen,
  useQuickLogMealType,
  useNutritionStore,
  useRecentFoods,
  useFrequentFoods,
} from '../../store/nutritionStore';
import { useFoodSearch, useMealLog } from '../../hooks/useNutrition';
import { useDebounce } from '../../hooks';
import { BarcodeScanner } from './BarcodeScanner';

const mealTypes = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, color: 'orange' },
  { id: 'morning_snack', label: 'AM Snack', icon: Apple, color: 'yellow' },
  { id: 'lunch', label: 'Lunch', icon: Sun, color: 'blue' },
  { id: 'afternoon_snack', label: 'PM Snack', icon: Apple, color: 'green' },
  { id: 'dinner', label: 'Dinner', icon: Moon, color: 'purple' },
  { id: 'evening_snack', label: 'Eve Snack', icon: Apple, color: 'pink' },
];

/**
 * Food item component
 */
function FoodItem({ food, onSelect }) {
  const name = food.name || food.quickEntryName || food.foodName || 'Unknown';
  const brand = food.brand || food.foodBrand;
  const calories = food.calories || food.totalCalories || 0;

  return (
    <motion.button
      onClick={() => onSelect(food)}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
        <Utensils className="w-5 h-5 text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{name}</p>
        {brand && (
          <p className="text-xs text-gray-400 truncate">{brand}</p>
        )}
      </div>
      <div className="text-right">
        <p className="text-white font-semibold">{calories}</p>
        <p className="text-xs text-gray-400">cal</p>
      </div>
    </motion.button>
  );
}

/**
 * Serving size selector
 */
function ServingSelector({ servings, setServings, servingDescription }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
      <div className="flex-1">
        <p className="text-sm text-gray-400 mb-1">Servings</p>
        <p className="text-white">{servingDescription || '1 serving'}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setServings(Math.max(0.25, servings - 0.25))}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <Minus className="w-4 h-4 text-white" />
        </button>
        <span className="text-xl font-bold text-white w-12 text-center">
          {servings}
        </span>
        <button
          onClick={() => setServings(servings + 0.25)}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

/**
 * Main Quick Log Modal
 */
export function QuickLogModal() {
  const isOpen = useQuickLogOpen();
  const mealType = useQuickLogMealType();
  const closeQuickLog = useNutritionStore((s) => s.closeQuickLog);
  const recentFoods = useRecentFoods();
  const frequentFoods = useFrequentFoods();

  const [step, setStep] = useState('search'); // search, confirm
  const [selectedFood, setSelectedFood] = useState(null);
  const [servings, setServings] = useState(1);
  const [selectedMealType, setSelectedMealType] = useState(mealType);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const { search, searchResults } = useFoodSearch();
  const { logMeal } = useMealLog();
  const inputRef = useRef(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Update meal type when prop changes
  useEffect(() => {
    setSelectedMealType(mealType);
  }, [mealType]);

  // Search when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      search(debouncedQuery);
    }
  }, [debouncedQuery, search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setStep('search');
      setSelectedFood(null);
      setServings(1);
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelectFood = useCallback((food) => {
    setSelectedFood(food);
    setServings(1);
    setStep('confirm');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedFood) return;

    setIsSubmitting(true);
    try {
      await logMeal({
        mealType: selectedMealType,
        foodId: selectedFood.id,
        servings,
        loggedVia: 'quick',
      });
      closeQuickLog();
    } catch (error) {
      console.error('Failed to log meal:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFood, selectedMealType, servings, logMeal, closeQuickLog]);

  const handleQuickCalories = useCallback(async (calories) => {
    setIsSubmitting(true);
    try {
      await logMeal({
        mealType: selectedMealType,
        quickEntryName: `Quick entry (${calories} cal)`,
        quickEntryCalories: calories,
        loggedVia: 'quick',
      });
      closeQuickLog();
    } catch (error) {
      console.error('Failed to log meal:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMealType, logMeal, closeQuickLog]);

  // Handle food found from barcode scanner
  const handleBarcodeFood = useCallback((food) => {
    setSelectedFood(food);
    setServings(1);
    setStep('confirm');
    setIsScannerOpen(false);
  }, []);

  // Display foods
  const displayFoods = searchQuery.length >= 2
    ? searchResults
    : [...recentFoods.slice(0, 5), ...frequentFoods.slice(0, 5)];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeQuickLog}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-hidden rounded-t-3xl"
          >
            <GlassSurface className="p-6 pb-safe">
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                    <Utensils className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {step === 'search' ? 'Log Food' : 'Confirm'}
                  </h2>
                </div>
                <button
                  onClick={closeQuickLog}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {step === 'search' ? (
                <>
                  {/* Meal Type Selector */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-2 px-2">
                    {mealTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedMealType(type.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          selectedMealType === type.id
                            ? 'bg-green-500 text-white'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search foods..."
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mb-4">
                    <button className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <Camera className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-gray-300">Photo</span>
                    </button>
                    <button
                      onClick={() => setIsScannerOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <Barcode className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-gray-300">Scan</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <Mic className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-gray-300">Voice</span>
                    </button>
                  </div>

                  {/* Quick Calories */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Quick Add</p>
                    <div className="flex gap-2">
                      {[100, 200, 300, 500].map((cal) => (
                        <button
                          key={cal}
                          onClick={() => handleQuickCalories(cal)}
                          disabled={isSubmitting}
                          className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
                        >
                          {cal} cal
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Food List */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {searchQuery.length < 2 && (
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        {recentFoods.length > 0 ? 'Recent & Frequent' : 'No recent foods'}
                      </p>
                    )}
                    {displayFoods.map((food, index) => (
                      <FoodItem
                        key={food.id || index}
                        food={food}
                        onSelect={handleSelectFood}
                      />
                    ))}
                    {searchQuery.length >= 2 && displayFoods.length === 0 && (
                      <p className="text-center text-gray-400 py-8">
                        No foods found. Try a different search.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Confirm Step */}
                  <div className="mb-6">
                    <FoodItem food={selectedFood} onSelect={() => {}} />
                  </div>

                  {/* Serving Selector */}
                  <div className="mb-6">
                    <ServingSelector
                      servings={servings}
                      setServings={setServings}
                      servingDescription={selectedFood?.servingDescription}
                    />
                  </div>

                  {/* Nutrition Preview */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Calories', value: Math.round((selectedFood?.calories || 0) * servings), color: 'text-white' },
                      { label: 'Protein', value: `${Math.round((selectedFood?.proteinG || 0) * servings)}g`, color: 'text-green-400' },
                      { label: 'Carbs', value: `${Math.round((selectedFood?.carbsG || 0) * servings)}g`, color: 'text-blue-400' },
                      { label: 'Fat', value: `${Math.round((selectedFood?.fatG || 0) * servings)}g`, color: 'text-yellow-400' },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-gray-400">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <GlassButton
                      variant="ghost"
                      className="flex-1"
                      onClick={() => setStep('search')}
                    >
                      Back
                    </GlassButton>
                    <GlassButton
                      variant="primary"
                      className="flex-1"
                      onClick={handleConfirm}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Logging...' : 'Log Food'}
                    </GlassButton>
                  </div>
                </>
              )}
            </GlassSurface>
          </motion.div>

          {/* Barcode Scanner Modal */}
          <BarcodeScanner
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onFoodFound={handleBarcodeFood}
          />
        </>
      )}
    </AnimatePresence>
  );
}

export default QuickLogModal;
