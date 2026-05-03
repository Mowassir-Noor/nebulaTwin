import { useAuthStore } from '@/store/authStore';

type Role = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 4,
  MANAGER: 3,
  OPERATOR: 2,
  VIEWER: 1,
};

export function useRole() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role || 'VIEWER') as Role;

  return {
    role,
    canEdit: ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.OPERATOR,
    canDelete: ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.MANAGER,
    canUpload: ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.MANAGER,
    isAdmin: role === 'ADMIN',
    isViewer: role === 'VIEWER',
  };
}
