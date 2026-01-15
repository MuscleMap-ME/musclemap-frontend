/**
 * Shopping List Page
 *
 * Displays aggregated shopping list from a meal plan
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Share2,
  Printer,
  Apple,
  Beef,
  Egg,
  Wheat,
  Package,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { GlassSurface } from '../components/glass/GlassSurface';
import { GlassButton } from '../components/glass/GlassButton';
import { GlassNav } from '../components/glass/GlassNav';
import { GlassSidebar } from '../components/glass/GlassSidebar';
import { GlassMobileNav } from '../components/glass/GlassMobileNav';
import { MeshBackground } from '../components/glass/MeshBackground';
import { useShoppingList } from '../hooks/useNutrition';

// Category icons and colors
const CATEGORY_CONFIG = {
  Produce: { icon: Apple, color: 'text-green-400', bg: 'bg-green-500/20' },
  'Meat & Seafood': { icon: Beef, color: 'text-red-400', bg: 'bg-red-500/20' },
  'Dairy & Eggs': { icon: Egg, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  'Grains & Bread': { icon: Wheat, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  'Canned & Dry Goods': { icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  'Spices & Condiments': { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  Other: { icon: ShoppingCart, color: 'text-gray-400', bg: 'bg-gray-500/20' },
};

/**
 * Category section component
 */
function CategorySection({ category, items, onToggleItem, onDeleteItem, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Other;
  const Icon = config.icon;

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="text-left">
            <h3 className="text-white font-medium">{category}</h3>
            <p className="text-xs text-gray-400">
              {checkedCount} of {totalCount} items
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {checkedCount === totalCount && totalCount > 0 && (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
              Complete
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="py-2 space-y-1">
              {items.map((item, index) => (
                <ShoppingListItem
                  key={`${item.name}-${index}`}
                  item={item}
                  onToggle={() => onToggleItem(category, index)}
                  onDelete={() => onDeleteItem(category, index)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Single shopping list item
 */
function ShoppingListItem({ item, onToggle, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group ${
        item.checked ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onToggle}
          className="flex-shrink-0 w-6 h-6 rounded border border-white/20 flex items-center justify-center hover:border-green-400 transition-colors"
        >
          {item.checked && <Check className="w-4 h-4 text-green-400" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-white truncate ${item.checked ? 'line-through text-gray-400' : ''}`}>
            {item.name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 whitespace-nowrap">
          {formatQuantity(item.quantity)} {item.unit}
        </span>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Format quantity for display
 */
function formatQuantity(quantity) {
  if (quantity === Math.floor(quantity)) {
    return quantity.toString();
  }
  // Handle common fractions
  const fractions = {
    0.25: '1/4',
    0.33: '1/3',
    0.5: '1/2',
    0.67: '2/3',
    0.75: '3/4',
  };

  const decimal = quantity - Math.floor(quantity);
  const whole = Math.floor(quantity);

  for (const [dec, frac] of Object.entries(fractions)) {
    if (Math.abs(decimal - parseFloat(dec)) < 0.05) {
      return whole > 0 ? `${whole} ${frac}` : frac;
    }
  }

  return quantity.toFixed(1);
}

/**
 * Progress bar component
 */
function ProgressBar({ checked, total }) {
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Shopping Progress</span>
        <span className="text-sm text-white font-medium">{percentage}% complete</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {checked} of {total} items checked off
      </p>
    </div>
  );
}

/**
 * Main Shopping List page
 */
export default function ShoppingList() {
  const { planId } = useParams();
  const { getShoppingList, generateShoppingList, isLoading } = useShoppingList();

  const [shoppingList, setShoppingList] = useState([]);
  const [planName, setPlanName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Group items by category
  const groupedItems = React.useMemo(() => {
    const groups = {};
    for (const item of shoppingList) {
      const category = item.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    }

    // Sort categories in a logical order
    const categoryOrder = [
      'Produce',
      'Meat & Seafood',
      'Dairy & Eggs',
      'Grains & Bread',
      'Canned & Dry Goods',
      'Spices & Condiments',
      'Other',
    ];

    return categoryOrder
      .filter((cat) => groups[cat])
      .map((cat) => ({ category: cat, items: groups[cat] }));
  }, [shoppingList]);

  // Calculate totals
  const totalItems = shoppingList.length;
  const checkedItems = shoppingList.filter((i) => i.checked).length;

  // Load shopping list
  const loadShoppingList = useCallback(async () => {
    if (!planId) return;

    try {
      const data = await getShoppingList(planId);
      setShoppingList(data.shoppingList || []);
      setPlanName(data.planName || 'Meal Plan');
    } catch (err) {
      console.error('Failed to load shopping list:', err);
    }
  }, [planId, getShoppingList]);

  useEffect(() => {
    loadShoppingList();
  }, [loadShoppingList]);

  // Regenerate shopping list
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const newList = await generateShoppingList(planId);
      setShoppingList(newList);
    } catch (err) {
      console.error('Failed to regenerate shopping list:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle item checked state
  const handleToggleItem = (category, itemIndex) => {
    setShoppingList((prev) => {
      const newList = [...prev];
      const categoryItems = newList.filter((i) => (i.category || 'Other') === category);
      const item = categoryItems[itemIndex];

      if (item) {
        const globalIndex = newList.findIndex(
          (i) => i.name === item.name && i.unit === item.unit
        );
        if (globalIndex >= 0) {
          newList[globalIndex] = { ...newList[globalIndex], checked: !newList[globalIndex].checked };
        }
      }

      return newList;
    });
  };

  // Delete item from list
  const handleDeleteItem = (category, itemIndex) => {
    setShoppingList((prev) => {
      const categoryItems = prev.filter((i) => (i.category || 'Other') === category);
      const item = categoryItems[itemIndex];

      if (item) {
        return prev.filter((i) => !(i.name === item.name && i.unit === item.unit));
      }

      return prev;
    });
  };

  // Share shopping list
  const handleShare = async () => {
    const text = groupedItems
      .map(
        ({ category, items }) =>
          `${category}:\n${items.map((i) => `  [ ] ${i.name} - ${formatQuantity(i.quantity)} ${i.unit}`).join('\n')}`
      )
      .join('\n\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Shopping List - ${planName}`,
          text,
        });
      } catch {
        // User cancelled or share failed - ignore
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
      alert('Shopping list copied to clipboard!');
    }
  };

  // Print shopping list
  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Shopping List - ${planName}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 20px; }
            h2 { font-size: 18px; margin: 20px 0 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            ul { list-style: none; padding: 0; margin: 0; }
            li { padding: 8px 0; border-bottom: 1px dotted #eee; display: flex; justify-content: space-between; }
            .checkbox { width: 16px; height: 16px; border: 1px solid #333; margin-right: 10px; display: inline-block; }
            .quantity { color: #666; }
          </style>
        </head>
        <body>
          <h1>Shopping List - ${planName}</h1>
          ${groupedItems
            .map(
              ({ category, items }) => `
            <h2>${category}</h2>
            <ul>
              ${items
                .map(
                  (item) => `
                <li>
                  <span><span class="checkbox"></span> ${item.name}</span>
                  <span class="quantity">${formatQuantity(item.quantity)} ${item.unit}</span>
                </li>
              `
                )
                .join('')}
            </ul>
          `
            )
            .join('')}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading && shoppingList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950">
        <MeshBackground />
        <GlassNav />
        <GlassSidebar />

        <main className="lg:pl-64 pt-16 pb-24 lg:pb-8">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <GlassSurface key={i} className="h-20 animate-pulse" />
              ))}
            </div>
          </div>
        </main>

        <GlassMobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <MeshBackground />
      <GlassNav />
      <GlassSidebar />

      <main className="lg:pl-64 pt-16 pb-24 lg:pb-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link to={planId ? `/nutrition/plans/${planId}` : '/nutrition/plans'}>
                <GlassButton variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </GlassButton>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Shopping List</h1>
                <p className="text-sm text-gray-400">{planName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={handleShare}
                title="Share list"
              >
                <Share2 className="w-4 h-4" />
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={handlePrint}
                title="Print list"
              >
                <Printer className="w-4 h-4" />
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh list"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </GlassButton>
            </div>
          </div>

          {/* Progress */}
          <GlassSurface className="p-6 mb-6">
            <ProgressBar checked={checkedItems} total={totalItems} />

            {checkedItems === totalItems && totalItems > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-500/20 rounded-lg">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">All items checked off!</span>
              </div>
            )}
          </GlassSurface>

          {/* Shopping list by category */}
          {groupedItems.length > 0 ? (
            <GlassSurface className="p-4">
              {groupedItems.map(({ category, items }) => (
                <CategorySection
                  key={category}
                  category={category}
                  items={items}
                  onToggleItem={handleToggleItem}
                  onDeleteItem={handleDeleteItem}
                />
              ))}
            </GlassSurface>
          ) : (
            <GlassSurface className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No items in shopping list</p>
              <p className="text-sm text-gray-500 mb-6">
                Add meals to your plan to generate a shopping list
              </p>
              <GlassButton
                variant="primary"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Generate Shopping List
              </GlassButton>
            </GlassSurface>
          )}

          {/* Quick stats */}
          {totalItems > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <GlassSurface className="p-4 text-center">
                <p className="text-2xl font-bold text-white">{totalItems}</p>
                <p className="text-xs text-gray-400">Total Items</p>
              </GlassSurface>
              <GlassSurface className="p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{checkedItems}</p>
                <p className="text-xs text-gray-400">Checked Off</p>
              </GlassSurface>
              <GlassSurface className="p-4 text-center">
                <p className="text-2xl font-bold text-white">{groupedItems.length}</p>
                <p className="text-xs text-gray-400">Categories</p>
              </GlassSurface>
            </div>
          )}
        </div>
      </main>

      <GlassMobileNav />
    </div>
  );
}
