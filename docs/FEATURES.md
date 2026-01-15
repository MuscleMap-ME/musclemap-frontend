# MuscleMap Features

> Auto-generated on 2026-01-15

## Overview

MuscleMap is a comprehensive fitness platform with 76 pages/features across multiple categories.

## Core Features

### Dashboard
Dashboard - MuscleMap Liquid Glass Design  A comprehensive, modern dashboard using the liquid glass design system inspired by visionOS and iOS 18 spatial computing aesthetics
- **Route**: `/dashboard`
- **Protected**: Yes (requires login)

### Exercises
Exercises page
- **Route**: `/exercises`
- **Protected**: No (public)

### Journey
Journey page
- **Route**: `/journey`
- **Protected**: No (public)

### Progression
Progression page
- **Route**: `/progression`
- **Protected**: No (public)

### Workout
Workout page
- **Route**: `/workout`
- **Protected**: No (public)

## Community

### CommunityDashboard
CommunityDashboard Page  Comprehensive community dashboard with: - Real-time activity feed - Geographic map view - Statistics dashboard - Monitoring panel (for mods/admins) - Privacy settings /
- **Route**: `/communitydashboard`
- **Protected**: Yes (requires login)

### Competitions
Competitions page
- **Route**: `/competitions`
- **Protected**: No (public)

### HighFives
HighFives page
- **Route**: `/highfives`
- **Protected**: No (public)

### Locations
Locations page
- **Route**: `/locations`
- **Protected**: No (public)

### Messages
Messages page
- **Route**: `/messages`
- **Protected**: No (public)

## User Account

### Credits
Credits page
- **Route**: `/credits`
- **Protected**: No (public)

### Profile
Profile page
- **Route**: `/profile`
- **Protected**: No (public)

### Settings
Settings page
- **Route**: `/settings`
- **Protected**: No (public)

### SkinsStore
SkinsStore page
- **Route**: `/skinsstore`
- **Protected**: No (public)

### Wallet
Wallet page
- **Route**: `/wallet`
- **Protected**: No (public)

## Public Pages

### Design
Design Page  Showcases MuscleMap's design system with links to the interactive design system page
- **Route**: `/design`
- **Protected**: No (public)

### Docs
Docs page
- **Route**: `/docs`
- **Protected**: No (public)

### Features
Features Page  Showcases MuscleMap features with VGA-style graphics, charts, and bars
- **Route**: `/features`
- **Protected**: No (public)

### Landing
Landing page
- **Route**: `/landing`
- **Protected**: No (public)

### Science
Science Page  Explains the science behind MuscleMap's Training Units and muscle activation system
- **Route**: `/science`
- **Protected**: No (public)

### Technology
Technology Stack Page  Showcases MuscleMap's technology architecture with VGA-style graphics
- **Route**: `/technology`
- **Protected**: No (public)

## Issue Tracker

### DevUpdates
Dev Updates Page  Development updates, announcements, and changelog: - Release notes - Bug fixes - Feature announcements /
- **Route**: `/devupdates`
- **Protected**: No (public)

### IssueDetail
Issue Detail Page  Single issue view with: - Full issue details - Comments thread - Voting and subscription - Status history /
- **Route**: `/issuedetail`
- **Protected**: Yes (requires login)

### Issues
Issues Page  Bug and issue tracker with: - Issue listing with filters - Search functionality - Voting system - Status badges /
- **Route**: `/issues`
- **Protected**: Yes (requires login)

### MyIssues
My Issues Page  User's submitted issues: - View status of reported issues - Track responses /
- **Route**: `/myissues`
- **Protected**: Yes (requires login)

### NewIssue
New Issue Page  Create a new bug report, feature request, or other issue: - Form with validation - Auto-capture browser/device info - Screenshot upload - Label selection /
- **Route**: `/newissue`
- **Protected**: No (public)

### Roadmap
Roadmap Page  Public roadmap showing: - Planned features - In progress work - Completed features - Voting on priorities /
- **Route**: `/roadmap`
- **Protected**: No (public)

## Admin

### AdminControl
AdminControl page
- **Route**: `/admincontrol`
- **Protected**: No (public)

### AdminIssues
Admin Issues Page  Admin dashboard for managing issues: - View all issues (including private) - Change status, priority, assignee - Bulk actions - Create dev updates - Manage roadmap /
- **Route**: `/adminissues`
- **Protected**: Yes (requires login)

## Auth

### Login
Login page
- **Route**: `/login`
- **Protected**: Yes (requires login)

### Onboarding
Handle archetype selection from ArchetypeSelector The selector already calls the API, so we just update state and move to step 2 /
- **Route**: `/onboarding`
- **Protected**: Yes (requires login)

### Signup
Signup page
- **Route**: `/signup`
- **Protected**: Yes (requires login)


## Feature Highlights

### Real-Time Muscle Visualization
- 3D muscle model using Three.js
- Color-coded muscle activation display
- Interactive body part selection

### Workout Tracking
- Log exercises with sets, reps, weight
- Timer for rest periods
- Progress tracking over time

### Community Features
- Leaderboards and competitions
- Location-based gym finder
- High-five system for encouragement
- Direct messaging

### Gamification
- XP and leveling system
- Achievements and badges
- Character stats (RPG-style)
- Skins and customization

### AI Integration
- Personalized workout recommendations
- Exercise form analysis (planned)
- Nutrition suggestions (planned)

## Mobile App

The React Native mobile app (in `apps/mobile/`) provides:
- Native iOS and Android experience
- HealthKit/Google Fit integration
- Push notifications
- Offline workout logging

## API

Full API documentation available at `docs/API_REFERENCE.md`.
