/**
 * EventBreakdown - Visual breakdown of test events with status indicators
 *
 * Displays each event in a career standard with its pass/fail status,
 * score, and visual progress indicators.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

/**
 * Event status configuration
 */
const STATUS_CONFIG = {
  passed: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: '\u2705',
    label: 'Passed',
  },
  failed: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: '\u274C',
    label: 'Failed',
  },
  needs_work: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: '\u26A0\uFE0F',
    label: 'Needs Work',
  },
  no_data: {
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
    icon: '\u2754',
    label: 'No Data',
  },
};

/**
 * EventBreakdown Component
 *
 * @param {Array} events - List of event results
 * @param {boolean} compact - Use compact layout
 * @param {boolean} expandable - Allow expanding event details
 * @param {Function} onEventClick - Callback when an event is clicked
 */
export default function EventBreakdown({
  events = [],
  compact = false,
  expandable = true,
  onEventClick,
}) {
  const [expandedEvent, setExpandedEvent] = useState(null);

  // Calculate summary stats
  const summary = {
    total: events.length,
    passed: events.filter((e) => e.status === 'passed' || e.passed === true).length,
    failed: events.filter((e) => e.status === 'failed' || e.passed === false).length,
    needsWork: events.filter((e) => e.status === 'needs_work').length,
    noData: events.filter((e) => !e.status && e.passed === null).length,
  };

  const handleEventClick = (event) => {
    if (expandable) {
      setExpandedEvent(expandedEvent === event.id ? null : event.id);
    }
    onEventClick?.(event);
  };

  if (events.length === 0) {
    return (
      <div className="p-6 text-center bg-[var(--glass-white-5)] rounded-xl">
        <div className="text-[var(--text-quaternary)] mb-2">No event data</div>
        <p className="text-sm text-[var(--text-tertiary)]">
          Log an assessment to see your event breakdown
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Summary */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[var(--text-primary)]">Event Breakdown</h3>
        <div className="flex items-center gap-3 text-sm">
          {summary.passed > 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckIcon className="w-4 h-4" />
              {summary.passed}
            </span>
          )}
          {summary.failed > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <XIcon className="w-4 h-4" />
              {summary.failed}
            </span>
          )}
          {summary.needsWork > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertIcon className="w-4 h-4" />
              {summary.needsWork}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar Summary */}
      <div className="h-2 rounded-full bg-[var(--glass-white-10)] overflow-hidden flex">
        {summary.passed > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(summary.passed / summary.total) * 100}%` }}
            className="h-full bg-emerald-500"
          />
        )}
        {summary.needsWork > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(summary.needsWork / summary.total) * 100}%` }}
            className="h-full bg-amber-500"
          />
        )}
        {summary.failed > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(summary.failed / summary.total) * 100}%` }}
            className="h-full bg-red-500"
          />
        )}
      </div>

      {/* Event List */}
      {compact ? (
        <CompactEventList events={events} />
      ) : (
        <div className="space-y-2">
          {events.map((event, index) => (
            <EventCard
              key={event.id || event.eventId || index}
              event={event}
              expanded={expandedEvent === (event.id || event.eventId)}
              onClick={() => handleEventClick(event)}
              expandable={expandable}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CompactEventList - Condensed grid view of events
 */
function CompactEventList({ events }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {events.map((event, index) => {
        const status = getEventStatus(event);
        const config = STATUS_CONFIG[status];

        return (
          <motion.div
            key={event.id || event.eventId || index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className={clsx(
              'p-3 rounded-lg border transition-colors',
              config.bg,
              config.border,
              'hover:opacity-80 cursor-pointer'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{config.icon}</span>
              <span className={clsx('text-sm font-medium truncate', config.text)}>
                {event.name || event.eventName}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * EventCard - Full event display card
 */
function EventCard({ event, expanded, onClick, expandable, index }) {
  const status = getEventStatus(event);
  const config = STATUS_CONFIG[status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={clsx(
        'rounded-xl border overflow-hidden transition-all',
        config.bg,
        config.border,
        expandable && 'cursor-pointer hover:opacity-90'
      )}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Status Icon */}
          <div
            className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0',
              status === 'passed' && 'bg-emerald-500/30',
              status === 'failed' && 'bg-red-500/30',
              status === 'needs_work' && 'bg-amber-500/30',
              status === 'no_data' && 'bg-gray-500/30'
            )}
          >
            {config.icon}
          </div>

          {/* Event Info */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--text-primary)] truncate">
              {event.name || event.eventName}
            </div>
            <div className="text-sm text-[var(--text-tertiary)] flex items-center gap-2">
              <span className={config.text}>{config.label}</span>
              {event.score && (
                <>
                  <span className="text-[var(--text-quaternary)]">|</span>
                  <span>Score: {event.score}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Standard/Requirement */}
        {event.standard && (
          <div className="text-right flex-shrink-0 ml-4">
            <div className="text-xs text-[var(--text-quaternary)]">Standard</div>
            <div className="text-sm font-medium text-[var(--text-secondary)]">
              {event.standard}
            </div>
          </div>
        )}

        {/* Expand Icon */}
        {expandable && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            className="ml-2 flex-shrink-0"
          >
            <ChevronDownIcon className="w-5 h-5 text-[var(--text-quaternary)]" />
          </motion.div>
        )}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)] space-y-3">
              {/* Last Assessment */}
              {event.lastAssessment && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-tertiary)]">Last Assessment</span>
                  <span className="text-[var(--text-secondary)]">
                    {new Date(event.lastAssessment).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Best Score */}
              {event.bestScore && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-tertiary)]">Best Score</span>
                  <span className="text-emerald-400 font-medium">{event.bestScore}</span>
                </div>
              )}

              {/* Progress */}
              {event.progress !== undefined && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[var(--text-tertiary)]">Progress</span>
                    <span className="text-[var(--text-secondary)]">{event.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--glass-white-10)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${event.progress}%` }}
                      className={clsx(
                        'h-full rounded-full',
                        event.progress >= 100
                          ? 'bg-emerald-500'
                          : event.progress >= 70
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              {event.notes && (
                <div className="text-sm">
                  <span className="text-[var(--text-tertiary)]">Notes: </span>
                  <span className="text-[var(--text-secondary)]">{event.notes}</span>
                </div>
              )}

              {/* Tips */}
              {event.tips && event.tips.length > 0 && (
                <div className="p-3 rounded-lg bg-[var(--glass-white-5)]">
                  <div className="text-xs font-medium text-[var(--text-tertiary)] mb-2">
                    Improvement Tips
                  </div>
                  <ul className="space-y-1">
                    {event.tips.map((tip, i) => (
                      <li
                        key={i}
                        className="text-sm text-[var(--text-secondary)] flex items-start gap-2"
                      >
                        <span className="text-[var(--brand-blue-400)]">-</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Get event status from various data formats
 */
function getEventStatus(event) {
  if (event.status) return event.status;
  if (event.passed === true) return 'passed';
  if (event.passed === false) return 'failed';
  if (event.needsWork) return 'needs_work';
  return 'no_data';
}

// Icon components
function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function AlertIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
