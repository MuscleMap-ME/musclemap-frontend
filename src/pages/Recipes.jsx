/**
 * Recipes Page
 *
 * Browse, create, and manage recipes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Heart,
  Clock,
  Users,
  Flame,
  ArrowLeft,
  Star,
  ChefHat,
  X,
  Check,
  ChevronRight,
  Utensils,
} from 'lucide-react';
import { GlassSurface } from '../components/glass/GlassSurface';
import { GlassButton } from '../components/glass/GlassButton';
import { GlassNav } from '../components/glass/GlassNav';
import { GlassSidebar } from '../components/glass/GlassSidebar';
import { GlassMobileNav } from '../components/glass/GlassMobileNav';
import { MeshBackground } from '../components/glass/MeshBackground';
import { useRecipes } from '../hooks/useNutrition';

const MEAL_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const DIET_TYPES = [
  { value: 'all', label: 'All Diets' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'gluten_free', label: 'Gluten-Free' },
];

/**
 * Recipe card component
 */
function RecipeCard({ recipe, onSave, onUnsave, isSaved }) {
  const navigate = useNavigate();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group cursor-pointer"
      onClick={() => navigate(`/nutrition/recipes/${recipe.id}`)}
    >
      <GlassSurface className="overflow-hidden hover:bg-white/10 transition-colors">
        {/* Image placeholder */}
        <div className="h-40 bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center relative">
          <ChefHat className="w-12 h-12 text-green-400/50" />

          {/* Save button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              isSaved ? onUnsave(recipe.id) : onSave(recipe.id);
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <Heart
              className={`w-4 h-4 ${isSaved ? 'text-red-400 fill-red-400' : 'text-white'}`}
            />
          </button>

          {/* Rating badge */}
          {recipe.rating > 0 && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur text-xs text-white">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              {recipe.rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-white font-semibold mb-1 truncate group-hover:text-green-400 transition-colors">
            {recipe.name}
          </h3>

          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {recipe.description || 'A delicious recipe'}
          </p>

          {/* Macros */}
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              {recipe.totalCalories} cal
            </span>
            <span>{recipe.totalProteinG}g P</span>
            <span>{recipe.totalCarbsG}g C</span>
            <span>{recipe.totalFatG}g F</span>
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {recipe.prepTimeMin + recipe.cookTimeMin} min
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </GlassSurface>
    </motion.div>
  );
}

/**
 * Recipe detail modal/page
 */
function RecipeDetail({ recipe, onClose }) {
  if (!recipe) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <GlassSurface className="overflow-hidden">
            {/* Header */}
            <div className="h-48 bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center relative">
              <ChefHat className="w-20 h-20 text-green-400/50" />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              <h1 className="text-2xl font-bold text-white mb-2">{recipe.name}</h1>
              <p className="text-gray-400 mb-6">{recipe.description}</p>

              {/* Macros */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <p className="text-2xl font-bold text-white">{recipe.totalCalories}</p>
                  <p className="text-xs text-gray-400">Calories</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <p className="text-2xl font-bold text-green-400">{recipe.totalProteinG}g</p>
                  <p className="text-xs text-gray-400">Protein</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <p className="text-2xl font-bold text-blue-400">{recipe.totalCarbsG}g</p>
                  <p className="text-xs text-gray-400">Carbs</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <p className="text-2xl font-bold text-yellow-400">{recipe.totalFatG}g</p>
                  <p className="text-xs text-gray-400">Fat</p>
                </div>
              </div>

              {/* Ingredients */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-3">Ingredients</h2>
                <div className="space-y-2">
                  {recipe.ingredients?.map((ing, i) => (
                    <div key={i} className="flex items-center gap-3 text-gray-300">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                        {i + 1}
                      </div>
                      <span>
                        {ing.quantity} {ing.unit} {ing.food?.name || ing.customFood?.name}
                        {ing.notes && <span className="text-gray-500 text-sm"> ({ing.notes})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              {recipe.instructions && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-white mb-3">Instructions</h2>
                  <div className="space-y-4">
                    {recipe.instructions.split('\n').filter(Boolean).map((step, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex-shrink-0 flex items-center justify-center text-green-400 font-semibold">
                          {i + 1}
                        </div>
                        <p className="text-gray-300 pt-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <GlassButton variant="primary" className="flex-1">
                  <Utensils className="w-4 h-4 mr-2" />
                  Log This Meal
                </GlassButton>
                <GlassButton variant="ghost">
                  <Heart className="w-4 h-4" />
                </GlassButton>
              </div>
            </div>
          </GlassSurface>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Main Recipes page
 */
export default function Recipes() {
  const { recipeId } = useParams();
  const navigate = useNavigate();

  const { searchRecipes, getPopularRecipes, getRecipe, saveRecipe, unsaveRecipe } = useRecipes();

  const [recipes, setRecipes] = useState([]);
  const [popularRecipes, setPopularRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [selectedDietType, setSelectedDietType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Load recipes
  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      const filter = {};
      if (selectedMealType !== 'all') filter.mealType = selectedMealType;
      if (selectedDietType !== 'all') filter.dietType = selectedDietType;
      if (searchQuery) filter.search = searchQuery;

      const result = await searchRecipes(filter, { field: 'rating', direction: 'desc' });
      setRecipes(result.items || []);
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchRecipes, selectedMealType, selectedDietType, searchQuery]);

  // Load popular recipes
  useEffect(() => {
    getPopularRecipes(6).then(setPopularRecipes).catch(console.error);
  }, [getPopularRecipes]);

  // Load filtered recipes
  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  // Load specific recipe if ID in URL
  useEffect(() => {
    if (recipeId) {
      getRecipe(recipeId).then(setSelectedRecipe).catch(console.error);
    } else {
      setSelectedRecipe(null);
    }
  }, [recipeId, getRecipe]);

  const handleSave = async (id) => {
    try {
      await saveRecipe(id);
      setSavedRecipeIds((prev) => new Set([...prev, id]));
    } catch (err) {
      console.error('Failed to save recipe:', err);
    }
  };

  const handleUnsave = async (id) => {
    try {
      await unsaveRecipe(id);
      setSavedRecipeIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Failed to unsave recipe:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <MeshBackground />
      <GlassNav />
      <GlassSidebar />

      <main className="lg:pl-64 pt-16 pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link to="/nutrition">
                <GlassButton variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </GlassButton>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Recipes</h1>
                <p className="text-gray-400">Discover healthy recipes for your goals</p>
              </div>
            </div>
            <GlassButton variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              New Recipe
            </GlassButton>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                           placeholder-gray-500 focus:outline-none focus:border-green-500/50"
              />
            </div>
            <GlassButton
              variant={showFilters ? 'primary' : 'ghost'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </GlassButton>
          </div>

          {/* Filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <GlassSurface className="p-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Meal Type</label>
                      <div className="flex flex-wrap gap-2">
                        {MEAL_TYPES.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => setSelectedMealType(type.value)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                              selectedMealType === type.value
                                ? 'bg-green-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Diet Type</label>
                      <div className="flex flex-wrap gap-2">
                        {DIET_TYPES.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => setSelectedDietType(type.value)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                              selectedDietType === type.value
                                ? 'bg-green-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassSurface>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Popular Recipes */}
          {!searchQuery && selectedMealType === 'all' && selectedDietType === 'all' && popularRecipes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Popular Recipes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onSave={handleSave}
                    onUnsave={handleUnsave}
                    isSaved={savedRecipeIds.has(recipe.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Recipes */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              {searchQuery ? `Results for "${searchQuery}"` : 'All Recipes'}
            </h2>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <GlassSurface key={i} className="h-64 animate-pulse" />
                ))}
              </div>
            ) : recipes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {recipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onSave={handleSave}
                      onUnsave={handleUnsave}
                      isSaved={savedRecipeIds.has(recipe.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <GlassSurface className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No recipes found</p>
                <GlassButton variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Recipe
                </GlassButton>
              </GlassSurface>
            )}
          </div>
        </div>
      </main>

      <GlassMobileNav />

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {selectedRecipe && (
          <RecipeDetail
            recipe={selectedRecipe}
            onClose={() => navigate('/nutrition/recipes')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
