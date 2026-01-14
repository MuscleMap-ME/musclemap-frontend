/**
 * Organizations Module Types
 *
 * Type definitions for enterprise organization management.
 * Aligned with migration 076_enterprise_organizations.
 */

export type OrgRole = 'owner' | 'admin' | 'supervisor' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type MemberStatus = 'active' | 'inactive' | 'on_leave';
export type SubscriptionTier = 'trial' | 'basic' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export type OrgPermission =
  | 'org:read'
  | 'org:update'
  | 'org:delete'
  | 'org:manage_billing'
  | 'unit:create'
  | 'unit:read'
  | 'unit:update'
  | 'unit:delete'
  | 'member:invite'
  | 'member:read'
  | 'member:update'
  | 'member:remove'
  | 'member:manage_roles'
  | 'reports:view'
  | 'reports:export'
  | 'readiness:view'
  | 'readiness:manage';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
  logoUrl: string | null;
  website: string | null;
  // Location
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  timezone: string;
  // Contact
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  // Settings
  settings: OrgSettings;
  // Subscription
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionSeats: number | null;
  subscriptionExpiresAt: string | null;
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  // Computed counts (not in DB, calculated)
  memberCount?: number;
  unitCount?: number;
}

export interface OrgSettings {
  allowPublicJoin?: boolean;
  requireEmailDomain?: boolean;
  allowedDomains?: string[];
  defaultRole?: OrgRole;
  requireMfa?: boolean;
  ssoEnabled?: boolean;
  ssoProvider?: string | null;
  defaultPtTestId?: string | null;
  requireReadinessSharing?: boolean;
}

export interface OrgUnit {
  id: string;
  orgId: string;
  parentUnitId: string | null;
  name: string;
  code: string | null;
  type: string;
  // Location
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  // Hierarchy
  level: number;
  path: string | null;
  // Settings
  settings: Record<string, unknown>;
  // Status
  active: boolean;
  // Metadata
  createdAt: string;
  updatedAt: string;
  // Computed
  memberCount?: number;
}

export interface OrgUnitTree extends OrgUnit {
  children: OrgUnitTree[];
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  unitId: string | null;
  // Role & Permissions
  role: OrgRole;
  permissions: string[];
  // Employment details
  badgeNumber: string | null;
  employeeId: string | null;
  rank: string | null;
  title: string | null;
  hireDate: string | null;
  // Readiness sharing
  shareReadiness: boolean;
  shareAssessments: boolean;
  shareWeakEvents: boolean;
  optedInAt: string | null;
  // Status
  status: MemberStatus;
  // Metadata
  createdAt: string;
  updatedAt: string;
  invitedBy: string | null;
  // User info (populated via join)
  username?: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface OrgInvite {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  unitId: string | null;
  token: string;
  message: string | null;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  invitedBy: string;
  acceptedBy: string | null;
}

export interface OrgAuditLog {
  id: string;
  orgId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// Request/Response types
export interface CreateOrgData {
  name: string;
  slug?: string;
  type: string;
  logoUrl?: string;
  website?: string;
  // Location
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  timezone?: string;
  // Contact
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  // Settings
  settings?: Partial<OrgSettings>;
}

export interface UpdateOrgData {
  name?: string;
  slug?: string;
  type?: string;
  logoUrl?: string | null;
  website?: string | null;
  // Location
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string;
  timezone?: string;
  // Contact
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  // Settings
  settings?: Partial<OrgSettings>;
  // Subscription
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionSeats?: number | null;
  subscriptionExpiresAt?: string | null;
}

export interface CreateUnitData {
  name: string;
  code?: string;
  type: string;
  parentUnitId?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateUnitData {
  name?: string;
  code?: string | null;
  type?: string;
  parentUnitId?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  settings?: Record<string, unknown>;
  active?: boolean;
}

export interface MemberFilters {
  role?: OrgRole;
  unitId?: string | null;
  status?: MemberStatus;
  search?: string;
  shareReadiness?: boolean;
  limit?: number;
  offset?: number;
}

export interface UnitFilters {
  parentUnitId?: string | null;
  type?: string;
  active?: boolean;
  includeChildren?: boolean;
}

export interface BulkInviteItem {
  email: string;
  role?: OrgRole;
  unitId?: string;
  message?: string;
}

export interface BulkUpdateData {
  role?: OrgRole;
  unitId?: string | null;
  title?: string | null;
  rank?: string | null;
  status?: MemberStatus;
  permissions?: string[];
  shareReadiness?: boolean;
  shareAssessments?: boolean;
  shareWeakEvents?: boolean;
}

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<OrgRole, OrgPermission[]> = {
  owner: [
    'org:read', 'org:update', 'org:delete', 'org:manage_billing',
    'unit:create', 'unit:read', 'unit:update', 'unit:delete',
    'member:invite', 'member:read', 'member:update', 'member:remove', 'member:manage_roles',
    'reports:view', 'reports:export',
    'readiness:view', 'readiness:manage',
  ],
  admin: [
    'org:read', 'org:update', 'org:manage_billing',
    'unit:create', 'unit:read', 'unit:update', 'unit:delete',
    'member:invite', 'member:read', 'member:update', 'member:remove', 'member:manage_roles',
    'reports:view', 'reports:export',
    'readiness:view', 'readiness:manage',
  ],
  supervisor: [
    'org:read',
    'unit:read', 'unit:update',
    'member:invite', 'member:read', 'member:update',
    'reports:view',
    'readiness:view',
  ],
  member: [
    'org:read',
    'unit:read',
    'member:read',
  ],
};
