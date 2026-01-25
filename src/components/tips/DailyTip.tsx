/**
 * DailyTip Component
 *
 * Displays a daily motivational tip on the dashboard.
 * Uses GraphQL query instead of REST API.
 */

import React, { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { TIPS_QUERY } from '../../graphql/queries';
import TipCard from './TipCard';

export default function DailyTip() {
  const [dismissed, setDismissed] = useState(false);

  const { data, loading } = useQuery(TIPS_QUERY, {
    variables: { context: 'dashboard' },
    fetchPolicy: 'cache-first',
  });

  // Get first tip from results
  const tip = data?.tips?.[0] || null;

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
