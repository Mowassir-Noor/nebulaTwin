/* eslint-disable */
import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import type { CollaborationUser } from '@/types';

interface PresenceIndicatorProps {
  users: CollaborationUser[];
  currentUserId: string;
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-yellow-500', 'bg-red-500',
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function PresenceIndicator({ users, currentUserId }: PresenceIndicatorProps) {
  const otherUsers = users.filter((u) => u.userId !== currentUserId);

  if (otherUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Users size={14} className="text-muted-foreground" />
      <div className="flex -space-x-2">
        {otherUsers.slice(0, 5).map((user) => (
          <div
            key={user.userId}
            className={`w-7 h-7 rounded-full ${getColorForUser(user.userId)} flex items-center justify-center text-white text-[10px] font-bold border-2 border-background`}
            title={user.userName}
          >
            {getInitials(user.userName)}
          </div>
        ))}
        {otherUsers.length > 5 && (
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
            +{otherUsers.length - 5}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {otherUsers.length} {otherUsers.length === 1 ? 'collaborator' : 'collaborators'}
      </span>
    </div>
  );
}

export default PresenceIndicator;
