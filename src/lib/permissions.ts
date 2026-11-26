export type Role = 'free' | 'pro' | 'business' | 'admin';

export type Action = 
  | 'create:qr' 
  | 'edit:qr' 
  | 'delete:qr' 
  | 'view:analytics' 
  | 'ai:generate' 
  | 'bulk:export' 
  | 'manage:tasks'
  | 'custom:domain'
  | 'manage:org'
  | 'whitelabel'
  | 'admin:panel';

interface TierLimits {
  maxDomains: number;
  maxQRs: number;
  canWhitelabel: boolean;
  canManageOrg: boolean;
}

const TIER_LIMITS: Record<Role, TierLimits> = {
  free: {
    maxDomains: 0,
    maxQRs: 5,
    canWhitelabel: false,
    canManageOrg: false
  },
  pro: {
    maxDomains: 1,
    maxQRs: 50,
    canWhitelabel: false,
    canManageOrg: true
  },
  business: {
    maxDomains: 4,
    maxQRs: 500,
    canWhitelabel: true,
    canManageOrg: true
  },
  admin: {
    maxDomains: 999,
    maxQRs: 9999,
    canWhitelabel: true,
    canManageOrg: true
  }
};

export const ROLE_PERMISSIONS: Record<Role, Action[]> = {
  free: [
    'create:qr', 
    'edit:qr', 
    'delete:qr', 
    'view:analytics'
  ],
  pro: [
    'create:qr', 
    'edit:qr', 
    'delete:qr', 
    'view:analytics', 
    'ai:generate', 
    'manage:tasks',
    'custom:domain'
  ],
  business: [
    'create:qr', 
    'edit:qr', 
    'delete:qr', 
    'view:analytics', 
    'ai:generate', 
    'bulk:export', 
    'manage:tasks',
    'custom:domain',
    'manage:org',
    'whitelabel'
  ],
  admin: [
    'create:qr', 
    'edit:qr', 
    'delete:qr', 
    'view:analytics', 
    'ai:generate', 
    'bulk:export', 
    'manage:tasks',
    'custom:domain',
    'manage:org',
    'whitelabel',
    'admin:panel'
  ]
};

export function hasPermission(role: Role | undefined, action: Action, subscriptionStatus?: string): boolean {
  // Trial users get access to everything except admin panel
  if (subscriptionStatus === 'trialing') {
    if (action === 'admin:panel') return role === 'admin';
    return true;
  }
  
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(action);
}

export function getTierLimits(role: Role | undefined, subscriptionStatus?: string): TierLimits {
  if (subscriptionStatus === 'trialing') {
    return TIER_LIMITS['business'];
  }
  return TIER_LIMITS[role || 'free'];
}

export function getRestrictedActions(role: Role | undefined): Action[] {
  const allActions: Action[] = [
    'create:qr', 'edit:qr', 'delete:qr', 'view:analytics', 
    'ai:generate', 'bulk:export', 'manage:tasks', 'custom:domain',
    'manage:org', 'whitelabel', 'admin:panel'
  ];
  if (!role) return allActions;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return allActions.filter(action => !permissions.includes(action));
}
