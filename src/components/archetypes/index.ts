/**
 * Archetype Components
 *
 * Reusable UI components for displaying and selecting archetypes.
 *
 * Components:
 * - ArchetypeSelector: Main orchestrating component for the drill-down flow
 * - CategoryGrid: Top-level category selection (Tier 1)
 * - ArchetypeGrid: Archetype selection within category (Tier 2)
 * - ArchetypeDetail: Full-screen detail and confirmation (Tier 3)
 * - ArchetypeCard: Individual archetype display card
 */

export { default as ArchetypeSelector } from './ArchetypeSelector';
export { default as ArchetypeCard } from './ArchetypeCard';
export { default as ArchetypeDetail } from './ArchetypeDetail';
export { default as ArchetypeGrid } from './ArchetypeGrid';
export { default as CategoryGrid } from './CategoryGrid';
