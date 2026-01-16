/**
 * Privacy Policy Page
 *
 * Required for App Store submission.
 * URL: https://musclemap.me/privacy
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';

const PRIVACY_POLICY = `# MuscleMap Privacy Policy

Last Updated: ${new Date().toISOString().split('T')[0]}

## Overview

MuscleMap ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.

## Information We Collect

### Information You Provide
- **Account Information**: Email address, username, and password when you create an account
- **Profile Information**: Name, profile photo, fitness goals, and preferences
- **Workout Data**: Exercises, sets, reps, weights, and workout history
- **Health Data**: With your permission, we access HealthKit/Google Fit data including workouts, heart rate, and activity

### Information Collected Automatically
- **Device Information**: Device type, operating system, and unique device identifiers
- **Usage Data**: App interactions, features used, and session duration
- **Analytics**: Aggregated, anonymized usage statistics

## How We Use Your Information

- Provide and improve our fitness tracking services
- Personalize your workout recommendations
- Display your progress and achievements
- Enable social features and community interactions
- Send important updates about your account
- Analyze app performance and user experience

## Data Sharing

We do not sell your personal information. We may share data with:
- **Service Providers**: Third-party services that help us operate the app
- **Legal Requirements**: When required by law or to protect our rights
- **With Your Consent**: When you explicitly agree to sharing

## Health Data

We treat health and fitness data with extra care:
- HealthKit/Google Fit data is only accessed with your explicit permission
- Health data is encrypted in transit and at rest
- We never share health data with third parties for advertising
- You can revoke access at any time in your device settings

## Data Security

We implement industry-standard security measures:
- Encryption of data in transit (TLS/SSL)
- Encryption of sensitive data at rest
- Regular security audits
- Secure authentication practices

## Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your account and data
- Export your workout history
- Opt out of analytics

## Data Retention

- Account data is retained while your account is active
- Workout history is retained until you delete it or your account
- You can request complete data deletion at any time

## Children's Privacy

MuscleMap is not intended for children under 13. We do not knowingly collect data from children under 13.

## Changes to This Policy

We may update this Privacy Policy periodically. We will notify you of significant changes via the app or email.

## Contact Us

For privacy-related questions or requests:
- Email: privacy@musclemap.me
- Support: https://musclemap.me/support

## California Residents (CCPA)

California residents have additional rights under the CCPA, including the right to know what personal information is collected and the right to opt out of the sale of personal information.

## European Users (GDPR)

If you are in the European Economic Area, you have additional rights under GDPR including data portability and the right to lodge a complaint with a supervisory authority.
`;

export default function Privacy() {
  return (
    <div className="min-h-screen bg-mesh-void">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-8"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to MuscleMap
          </a>
        </div>

        {/* Content */}
        <article className="card-glass p-8 md:p-12">
          <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-4xl font-bold text-text-primary mb-8 bg-gradient-to-r from-brand-blue-400 to-brand-pulse-400 bg-clip-text text-transparent">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-semibold text-text-primary mt-10 mb-4 border-b border-border-subtle pb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-medium text-text-primary mt-6 mb-3">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-text-secondary leading-relaxed mb-4">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-text-secondary space-y-2 mb-4 ml-4">
                    {children}
                  </ul>
                ),
                li: ({ children }) => (
                  <li className="text-text-secondary">
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="text-text-primary font-semibold">
                    {children}
                  </strong>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-brand-blue-400 hover:text-brand-blue-300 underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {PRIVACY_POLICY}
            </ReactMarkdown>
          </div>
        </article>

        {/* Footer */}
        <footer className="mt-12 text-center text-text-tertiary text-sm">
          <p>© {new Date().getFullYear()} MuscleMap. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
