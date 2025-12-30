/**
 * @musclemap/core - Permissions System
 */

type UserRole = 'user' | 'admin' | 'moderator' | 'developer';
type GroupRole = 'owner' | 'admin' | 'member' | 'viewer';

export const CorePermissions = {
  USERS_READ: 'users.read',
  USERS_WRITE: 'users.write',
  USERS_DELETE: 'users.delete',
  USERS_BAN: 'users.ban',
  GROUPS_CREATE: 'groups.create',
  GROUPS_READ: 'groups.read',
  GROUPS_WRITE: 'groups.write',
  GROUPS_DELETE: 'groups.delete',
  GROUPS_MANAGE_MEMBERS: 'groups.manage_members',
  GROUPS_MANAGE_POLICIES: 'groups.manage_policies',
  ECONOMY_READ: 'economy.read',
  ECONOMY_CHARGE: 'economy.charge',
  ECONOMY_REFUND: 'economy.refund',
  ECONOMY_GRANT: 'economy.grant',
  ECONOMY_MANAGE_TIERS: 'economy.manage_tiers',
  WORKOUTS_CREATE: 'workouts.create',
  WORKOUTS_READ: 'workouts.read',
  WORKOUTS_READ_ALL: 'workouts.read_all',
  WORKOUTS_DELETE: 'workouts.delete',
  COMPETITIONS_CREATE: 'competitions.create',
  COMPETITIONS_READ: 'competitions.read',
  COMPETITIONS_JOIN: 'competitions.join',
  COMPETITIONS_MANAGE: 'competitions.manage',
  ADMIN_ACCESS: 'admin.access',
  ADMIN_USERS: 'admin.users',
  ADMIN_GROUPS: 'admin.groups',
  ADMIN_ECONOMY: 'admin.economy',
  ADMIN_PLUGINS: 'admin.plugins',
  ADMIN_SYSTEM: 'admin.system',
  PLUGINS_INSTALL: 'plugins.install',
  PLUGINS_CONFIGURE: 'plugins.configure',
  PLUGINS_DISABLE: 'plugins.disable',
} as const;

export type CorePermission = typeof CorePermissions[keyof typeof CorePermissions];

export const RolePermissions: Record<UserRole, CorePermission[]> = {
  user: [
    CorePermissions.USERS_READ,
    CorePermissions.GROUPS_READ,
    CorePermissions.ECONOMY_READ,
    CorePermissions.WORKOUTS_CREATE,
    CorePermissions.WORKOUTS_READ,
    CorePermissions.COMPETITIONS_READ,
    CorePermissions.COMPETITIONS_JOIN,
  ],
  moderator: [
    CorePermissions.USERS_READ,
    CorePermissions.USERS_BAN,
    CorePermissions.GROUPS_READ,
    CorePermissions.GROUPS_MANAGE_MEMBERS,
    CorePermissions.ECONOMY_READ,
    CorePermissions.WORKOUTS_READ_ALL,
    CorePermissions.COMPETITIONS_READ,
    CorePermissions.COMPETITIONS_MANAGE,
    CorePermissions.ADMIN_ACCESS,
  ],
  developer: [
    CorePermissions.USERS_READ,
    CorePermissions.GROUPS_READ,
    CorePermissions.ECONOMY_READ,
    CorePermissions.WORKOUTS_CREATE,
    CorePermissions.WORKOUTS_READ,
    CorePermissions.COMPETITIONS_READ,
    CorePermissions.COMPETITIONS_JOIN,
    CorePermissions.PLUGINS_INSTALL,
    CorePermissions.PLUGINS_CONFIGURE,
  ],
  admin: Object.values(CorePermissions) as CorePermission[],
};

export const GroupRolePermissions: Record<GroupRole, string[]> = {
  viewer: ['group.view'],
  member: ['group.view', 'group.participate'],
  admin: ['group.view', 'group.participate', 'group.manage_members', 'group.settings'],
  owner: ['group.view', 'group.participate', 'group.manage_members', 'group.settings', 'group.delete', 'group.transfer'],
};

export interface PermissionContext {
  userId: string;
  userRoles: UserRole[];
  groupMemberships?: Map<string, GroupRole>;
  pluginPermissions?: string[];
}

export function hasPermission(ctx: PermissionContext, permission: string): boolean {
  const userPermissions = new Set<string>();
  
  for (const role of ctx.userRoles) {
    const rolePerms = RolePermissions[role] || [];
    for (const perm of rolePerms) {
      userPermissions.add(perm);
    }
  }

  if (ctx.pluginPermissions) {
    for (const perm of ctx.pluginPermissions) {
      userPermissions.add(perm);
    }
  }

  if (userPermissions.has(permission)) return true;

  const parts = permission.split('.');
  if (parts.length === 2) {
    if (userPermissions.has(`${parts[0]}.*`)) return true;
  }

  return false;
}

export function hasAnyPermission(ctx: PermissionContext, permissions: string[]): boolean {
  return permissions.some(p => hasPermission(ctx, p));
}

export function hasAllPermissions(ctx: PermissionContext, permissions: string[]): boolean {
  return permissions.every(p => hasPermission(ctx, p));
}

export function getAllPermissions(ctx: PermissionContext): string[] {
  const permissions = new Set<string>();
  
  for (const role of ctx.userRoles) {
    const rolePerms = RolePermissions[role] || [];
    for (const perm of rolePerms) {
      permissions.add(perm);
    }
  }

  if (ctx.pluginPermissions) {
    for (const perm of ctx.pluginPermissions) {
      permissions.add(perm);
    }
  }

  return Array.from(permissions).sort();
}

export function hasGroupPermission(ctx: PermissionContext, groupId: string, permission: string): boolean {
  if (!ctx.groupMemberships) return false;
  const role = ctx.groupMemberships.get(groupId);
  if (!role) return false;
  return (GroupRolePermissions[role] || []).includes(permission);
}

export function pluginPermission(pluginId: string, action: string): string {
  return `plugin:${pluginId}:${action}`;
}
