# MuscleMap Features

> Updated: 2026-01-09

## Overview

MuscleMap is a comprehensive fitness platform with 35+ pages/features across multiple categories.

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
- **Protected**: Yes (requires login)

### Progression
Progression page
- **Route**: `/progression`
- **Protected**: No (public)

### Workout
Workout page
- **Route**: `/workout`
- **Protected**: No (public)

### Skills (NEW)
Gymnastics/Calisthenics Skill Progression Trees - Master bodyweight skills from beginner to elite with 7 skill trees and 45+ skills including handstands, planche, front lever, muscle-ups, and more.
- **Route**: `/skills`, `/skills/:treeId`
- **Protected**: No (public), progress tracking requires login
- **Features**:
  - 7 skill tree categories (Handstands, Straight-Arm, Pulling, Pushing, Core, Rings, Dynamic)
  - 45+ individual skills with prerequisites
  - Practice session logging
  - Progress tracking with tier-based visualization
  - Skill leaderboards
  - XP and credit rewards for skill achievements
- **Planned Expansion**: Full USA Gymnastics (USAG) program coverage
  - Women's Artistic Gymnastics (Vault, Uneven Bars, Balance Beam, Floor)
  - Men's Artistic Gymnastics (Floor, Pommel Horse, Rings, Vault, P-Bars, High Bar)
  - Junior Olympic levels 1-10 + Elite
  - Boys and Girls / Men and Women divisions
  - 500+ official USAG skills with difficulty values

### Martial Arts (NEW)
Combat technique training with multiple disciplines and military combatives.
- **Route**: `/martial-arts`, `/martial-arts/:disciplineId`
- **Protected**: No (public), progress tracking requires login
- **Features**:
  - 10 disciplines: Boxing, Kickboxing, Muay Thai, BJJ, Wrestling, Judo, Self-Defense, MCMAP, Army Combatives, Krav Maga
  - 60+ techniques across all disciplines
  - Proficiency-based progression (0-100%)
  - Military/tactical toggle for service members
  - Practice logging with reps, rounds, partner drills
  - Category grouping (stances, strikes, submissions, etc.)
  - XP and credit rewards for technique mastery

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
- **Protected**: Yes (requires login)

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
- **Protected**: Yes (requires login)

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
Onboarding page
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
- Skill progression trees (gymnastics/calisthenics)

### Credits Economy
- Virtual currency earned through workouts and achievements
- Store for cosmetics and buddy items
- Training Buddy companion that evolves with your progress
- Leaderboard rewards (daily/weekly/monthly)
- Anti-abuse fraud detection

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
