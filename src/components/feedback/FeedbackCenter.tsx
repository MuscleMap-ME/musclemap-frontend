/**
 * FeedbackCenter Component
 *
 * The main feedback hub component that combines bug reporting,
 * feature suggestions, and links to the open source repository.
 */

import { useState } from 'react';
import { Github, Bug, Lightbulb, Users, ExternalLink } from 'lucide-react';
import { OpenSourceBanner } from './OpenSourceBanner';
import { BugReportForm } from './BugReportForm';
import { FeatureSuggestionForm } from './FeatureSuggestionForm';

const GITHUB_REPO = 'https://github.com/musclemap/musclemap-frontend';

type Tab = 'overview' | 'bug' | 'feature';

interface FeedbackCenterProps {
  className?: string;
}

export function FeedbackCenter({ className = '' }: FeedbackCenterProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: Users },
    { id: 'bug' as Tab, label: 'Report Bug', icon: Bug },
    { id: 'feature' as Tab, label: 'Suggest Feature', icon: Lightbulb },
  ];

  return (
    <div className={className}>
      <OpenSourceBanner className="mb-6" />

      <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Github className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Feedback & Contribute</h2>
          </div>
          <p className="text-sm text-gray-400">
            Help improve MuscleMap by reporting issues or suggesting features
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'bug' && <BugReportForm />}
          {activeTab === 'feature' && <FeatureSuggestionForm />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  const quickLinks = [
    {
      icon: Bug,
      title: 'View Open Bugs',
      description: "See what issues we're working on",
      href: `${GITHUB_REPO}/issues?q=is:open+label:bug`,
    },
    {
      icon: Lightbulb,
      title: 'Feature Requests',
      description: 'Browse and vote on feature ideas',
      href: `${GITHUB_REPO}/issues?q=is:open+label:enhancement`,
    },
    {
      icon: Github,
      title: 'Contribute Code',
      description: 'Read our contribution guide',
      href: `${GITHUB_REPO}/blob/main/CONTRIBUTING.md`,
    },
    {
      icon: Users,
      title: 'Discussions',
      description: 'Join the community conversation',
      href: `${GITHUB_REPO}/discussions`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((link) => (
          <a
            key={link.title}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
          >
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors">
              <link.icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium text-white group-hover:text-blue-300 transition-colors flex items-center gap-2">
                {link.title}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-sm text-gray-400">{link.description}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Good First Issues */}
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <h4 className="font-medium text-blue-400 mb-2">Good First Issues</h4>
        <p className="text-sm text-gray-300 mb-3">
          New to the codebase? These issues are perfect for first-time contributors.
        </p>
        <a
          href={`${GITHUB_REPO}/issues?q=is:open+label:"good+first+issue"`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Browse good first issues
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

export default FeedbackCenter;
