/**
 * Nutrition History Page
 *
 * View historical nutrition data and trends
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target,
  Check,
} from 'lucide-react';
import { GlassSurface } from '../components/glass/GlassSurface';
import { GlassButton } from '../components/glass/GlassButton';
import { GlassNav } from '../components/glass/GlassNav';
import { GlassSidebar } from '../components/glass/GlassSidebar';
import { GlassMobileNav } from '../components/glass/GlassMobileNav';
import { MeshBackground } from '../components/glass/MeshBackground';
import { useMealLog } from '../hooks/useNutrition';
import { useNutritionGoals, useNutritionStreaks } from '../store/nutritionStore';

/**
 * Calendar cell
 */
function CalendarCell({ date, data, goals, isToday, isSelected, onClick }) {
  const hasData = data && (data.totalCalories > 0 || data.mealCount > 0);
  const hitCalorieGoal = data && goals && data.totalCalories >= goals.calories * 0.9 && data.totalCalories <= goals.calories * 1.1;
  const hitProteinGoal = data && goals && data.totalProteinG >= goals.proteinG * 0.9;

  const dayNum = new Date(date).getDate();

  return (
    <button
      onClick={() => onClick(date)}
      className={`relative aspect-square p-1 rounded-xl transition-colors ${
        isSelected
          ? 'bg-green-500/30 border border-green-500/50'
          : isToday
            ? 'bg-white/10 border border-white/20'
            : 'hover:bg-white/5'
      }`}
    >
      <span className={`text-sm ${isToday ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
        {dayNum}
      </span>

      {hasData && (
        <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-0.5">
          {hitCalorieGoal && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
          {hitProteinGoal && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
          {!hitCalorieGoal && !hitProteinGoal && <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />}
        </div>
      )}
    </button>
  );
}

/**
 * Month calendar view
 */
function MonthCalendar({ month, year, data, goals, selectedDate, onSelectDate }) {
  const today = new Date().toISOString().split('T')[0];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay(); // 0 = Sunday
  const totalDays = lastDay.getDate();

  const days = [];

  // Add padding for days before month starts
  for (let i = 0; i < startPadding; i++) {
    days.push(null);
  }

  // Add actual days
  for (let i = 1; i <= totalDays; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push(dateStr);
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) =>
          date ? (
            <CalendarCell
              key={date}
              date={date}
              data={data[date]}
              goals={goals}
              isToday={date === today}
              isSelected={date === selectedDate}
              onClick={onSelectDate}
            />
          ) : (
            <div key={`empty-${i}`} className="aspect-square" />
          )
        )}
      </div>
    </div>
  );
}

/**
 * Day detail view
 */
function DayDetail({ date, data, goals }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (!data) {
    return (
      <GlassSurface className="p-6">
        <h3 className="text-lg font-semibold text-white mb-2">{formatDate(date)}</h3>
        <p className="text-gray-400">No data logged for this day</p>
      </GlassSurface>
    );
  }

  const calorieProgress = goals ? (data.totalCalories / goals.calories) * 100 : 0;
  const proteinProgress = goals ? (data.totalProteinG / goals.proteinG) * 100 : 0;
  const carbsProgress = goals ? (data.totalCarbsG / goals.carbsG) * 100 : 0;
  const fatProgress = goals ? (data.totalFatG / goals.fatG) * 100 : 0;

  return (
    <GlassSurface className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{formatDate(date)}</h3>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <p className="text-2xl font-bold text-white">{data.totalCalories}</p>
          <p className="text-xs text-gray-400">Calories</p>
          {goals && (
            <p className={`text-xs mt-1 ${
              calorieProgress >= 90 && calorieProgress <= 110 ? 'text-green-400' : 'text-gray-500'
            }`}>
              {Math.round(calorieProgress)}% of goal
            </p>
          )}
        </div>
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <p className="text-2xl font-bold text-green-400">{data.totalProteinG}g</p>
          <p className="text-xs text-gray-400">Protein</p>
          {goals && (
            <p className={`text-xs mt-1 ${proteinProgress >= 90 ? 'text-green-400' : 'text-gray-500'}`}>
              {Math.round(proteinProgress)}% of goal
            </p>
          )}
        </div>
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <p className="text-2xl font-bold text-blue-400">{data.totalCarbsG}g</p>
          <p className="text-xs text-gray-400">Carbs</p>
          {goals && (
            <p className={`text-xs mt-1 ${carbsProgress >= 90 ? 'text-green-400' : 'text-gray-500'}`}>
              {Math.round(carbsProgress)}% of goal
            </p>
          )}
        </div>
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <p className="text-2xl font-bold text-yellow-400">{data.totalFatG}g</p>
          <p className="text-xs text-gray-400">Fat</p>
          {goals && (
            <p className={`text-xs mt-1 ${fatProgress >= 90 ? 'text-green-400' : 'text-gray-500'}`}>
              {Math.round(fatProgress)}% of goal
            </p>
          )}
        </div>
      </div>

      {/* Indicators */}
      <div className="flex flex-wrap gap-2">
        {data.wasWorkoutDay && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/20 text-orange-400 text-sm rounded-full">
            <Flame className="w-3 h-3" />
            Workout Day
          </span>
        )}
        {data.metCalorieGoal && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
            <Check className="w-3 h-3" />
            Hit Calorie Goal
          </span>
        )}
        {data.metProteinGoal && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">
            <Target className="w-3 h-3" />
            Hit Protein Goal
          </span>
        )}
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 text-gray-300 text-sm rounded-full">
          {data.mealCount} meals logged
        </span>
      </div>
    </GlassSurface>
  );
}

/**
 * Stats summary
 */
function StatsSummary({ data, goals }) {
  // Calculate averages from data
  const dates = Object.keys(data).filter((d) => data[d]?.totalCalories > 0);
  const totalDays = dates.length;

  if (totalDays === 0) {
    return null;
  }

  const avgCalories = Math.round(dates.reduce((sum, d) => sum + data[d].totalCalories, 0) / totalDays);
  const avgProtein = Math.round(dates.reduce((sum, d) => sum + data[d].totalProteinG, 0) / totalDays);
  const daysOnTarget = dates.filter((d) => {
    const cal = data[d].totalCalories;
    return goals && cal >= goals.calories * 0.9 && cal <= goals.calories * 1.1;
  }).length;

  const _streak = dates
    .sort()
    .reverse()
    .reduce((streak, date, i, arr) => {
      if (i === 0) return 1;
      const prev = new Date(arr[i - 1]);
      const curr = new Date(date);
      const diff = (prev - curr) / (1000 * 60 * 60 * 24);
      return diff === 1 ? streak + 1 : streak;
    }, 0);

  return (
    <GlassSurface className="p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4">This Month&apos;s Summary</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{avgCalories}</p>
          <p className="text-xs text-gray-400">Avg Calories/Day</p>
          {goals && (
            <p className={`text-xs mt-1 flex items-center justify-center gap-1 ${
              avgCalories > goals.calories ? 'text-orange-400' : 'text-green-400'
            }`}>
              {avgCalories > goals.calories ? (
                <TrendingUp className="w-3 h-3" />
              ) : avgCalories < goals.calories * 0.9 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {Math.abs(avgCalories - goals.calories)} from goal
            </p>
          )}
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">{avgProtein}g</p>
          <p className="text-xs text-gray-400">Avg Protein/Day</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-400">{daysOnTarget}</p>
          <p className="text-xs text-gray-400">Days On Target</p>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round((daysOnTarget / totalDays) * 100)}% success rate
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-400">{totalDays}</p>
          <p className="text-xs text-gray-400">Days Logged</p>
        </div>
      </div>
    </GlassSurface>
  );
}

/**
 * Main History page
 */
export default function NutritionHistory() {
  const goals = useNutritionGoals();
  const streaks = useNutritionStreaks();
  const { loadMealsByDate: _loadMealsByDate } = useMealLog();

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthData, setMonthData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Load month data
  const loadMonthData = useCallback(async () => {
    setIsLoading(true);
    const data = {};

    // Get all dates in the month
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();

    // For demo, we'll just simulate some data
    // In production, this would load from the API
    for (let i = 1; i <= lastDay; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      // Simulated data - in production, would load from API
      if (Math.random() > 0.3) {
        data[dateStr] = {
          totalCalories: Math.floor(1500 + Math.random() * 1000),
          totalProteinG: Math.floor(100 + Math.random() * 100),
          totalCarbsG: Math.floor(150 + Math.random() * 100),
          totalFatG: Math.floor(50 + Math.random() * 50),
          mealCount: Math.floor(2 + Math.random() * 4),
          wasWorkoutDay: Math.random() > 0.5,
          metCalorieGoal: Math.random() > 0.4,
          metProteinGoal: Math.random() > 0.3,
        };
      }
    }

    setMonthData(data);
    setIsLoading(false);
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isCurrentMonth = currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-950">
      <MeshBackground />
      <GlassNav />
      <GlassSidebar />

      <main className="lg:pl-64 pt-16 pb-24 lg:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link to="/nutrition">
              <GlassButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </GlassButton>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">History</h1>
              <p className="text-gray-400">View your nutrition trends</p>
            </div>
          </div>

          {/* Streaks */}
          {streaks && (
            <GlassSurface className="p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{streaks.currentLoggingStreak} Day Streak</p>
                  <p className="text-xs text-gray-400">Best: {streaks.longestLoggingStreak} days</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Goal Streak</p>
                <p className="text-white font-medium">{streaks.currentGoalStreak} days</p>
              </div>
            </GlassSurface>
          )}

          {/* Stats Summary */}
          <StatsSummary data={monthData} goals={goals} />

          {/* Calendar */}
          <GlassSurface className="p-6 mb-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={goToPrevMonth}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <h2 className="text-xl font-semibold text-white">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
                className={`p-2 rounded-full transition-colors ${
                  isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'
                }`}
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                Hit calorie goal
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                Hit protein goal
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                Logged (off target)
              </div>
            </div>

            {/* Calendar grid */}
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <MonthCalendar
                month={currentMonth}
                year={currentYear}
                data={monthData}
                goals={goals}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            )}
          </GlassSurface>

          {/* Selected Day Detail */}
          <DayDetail date={selectedDate} data={monthData[selectedDate]} goals={goals} />
        </div>
      </main>

      <GlassMobileNav />
    </div>
  );
}
