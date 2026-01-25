/**
 * ExerciseTip Component
 *
 * Fetches and displays a contextual tip for the current exercise using GraphQL.
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { TIPS_QUERY } from '../../graphql/queries';
import TipCard from './TipCard';

interface ExerciseTipProps {
  exerciseId?: string;
  delay?: number;
}

export default function ExerciseTip({ exerciseId, delay = 2000 }: ExerciseTipProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data, loading } = useQuery(TIPS_QUERY, {
    variables: { exerciseId },
    skip: !exerciseId,
    fetchPolicy: 'cache-first',
  });

  // Get the first tip for this exercise
  const tip = data?.tips?.[0] || null;

  useEffect(() => {
    // Reset state when exercise changes
    setVisible(false);
    setDismissed(false);

    if (tip) {
      // Show tip after delay to not interrupt the user immediately
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [exerciseId, tip, delay]);

  if (loading || !tip || !visible || dismissed) {
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
