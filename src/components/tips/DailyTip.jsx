/**
 * DailyTip Component
 *
 * Displays a daily motivational tip on the dashboard.
 */

import React, { useEffect, useState } from 'react';
import { request } from '../../utils/httpClient';
import TipCard from './TipCard';

export default function DailyTip() {
  const [tip, setTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchTip = async () => {
      try {
        const response = await request('/tips?context=dashboard&limit=1');
        // API returns array, get first item
        const tips = response?.data || [];
        setTip(tips[0] || null);
      } catch (error) {
        console.error('Failed to fetch daily tip:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTip();
  }, []);

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">💡</span>
          <h3 className="text-sm font-medium text-gray-400">Did you know?</h3>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!tip || dismissed) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">💡</span>
        <h3 className="text-sm font-medium text-gray-400">Did you know?</h3>
      </div>
      <TipCard
        tip={tip}
        onDismiss={() => setDismissed(true)}
      />
    </div>
  );
}
