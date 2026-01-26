import React from 'react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';

interface JourneyHealthAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  message: string;
  actionUrl?: string;
  createdAt: string;
}

interface JourneyHealthAlertsProps {
  alerts: JourneyHealthAlert[];
  onDismiss?: (alertId: string) => void;
}

export function JourneyHealthAlerts({ alerts, onDismiss }: JourneyHealthAlertsProps) {
  const getSeverityIcon = (severity: JourneyHealthAlert['severity']) => {
    switch (severity) {
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      case 'success': return <CheckCircle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityStyles = (severity: JourneyHealthAlert['severity']) => {
    switch (severity) {
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'error':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">All Clear!</h3>
        <p className="text-sm text-gray-400">No health alerts at this time</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SafeAnimatePresence>
        {alerts.map((alert, index) => (
          <SafeMotion.div
            key={alert.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.05 }}
            className={`relative p-4 rounded-xl border ${getSeverityStyles(alert.severity)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{alert.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-500">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </span>
                  {alert.actionUrl && (
                    <a
                      href={alert.actionUrl}
                      className="text-xs font-medium hover:underline"
                    >
                      View Details →
                    </a>
                  )}
                </div>
              </div>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </SafeMotion.div>
        ))}
      </SafeAnimatePresence>
    </div>
  );
}
