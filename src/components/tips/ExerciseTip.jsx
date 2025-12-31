/**
 * ExerciseTip Component
 *
 * Fetches and displays a contextual tip for the current exercise.
 */

import React, { useEffect, useState } from 'react';
import { request } from '../../utils/httpClient';
import TipCard from './TipCard';

export default function ExerciseTip({ exerciseId, delay = 2000 }) {
  const [tip, setTip] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!exerciseId) return;

    // Reset state when exercise changes
    setTip(null);
    setVisible(false);
    setDismissed(false);

    const fetchTip = async () => {
      try {
        const response = await request(`/tips/exercise/${exerciseId}`);
        if (response?.data) {
          setTip(response.data);
          // Show tip after delay to not interrupt the user immediately
          setTimeout(() => setVisible(true), delay);
        }
      } catch (error) {
        console.error('Failed to fetch exercise tip:', error);
      }
    };

    fetchTip();
  }, [exerciseId, delay]);

  if (!tip || !visible || dismissed) {
    return null;
  }

  return (
    <div className="animate-fadeIn">
      <TipCard
        tip={tip}
        onDismiss={() => setDismissed(true)}
        compact
      />
    </div>
  );
}
