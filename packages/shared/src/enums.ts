export const NodeType = {
  FOLDER: 'FOLDER',
  FILE: 'FILE',
} as const;
export type NodeType = (typeof NodeType)[keyof typeof NodeType];

export const ShareType = {
  PUBLIC_LINK: 'PUBLIC_LINK',
  RESTRICTED: 'RESTRICTED',
} as const;
export type ShareType = (typeof ShareType)[keyof typeof ShareType];

export const ShareRole = {
  VIEWER: 'VIEWER',
} as const;
export type ShareRole = (typeof ShareRole)[keyof typeof ShareRole];

export const Permission = {
  READ: 'READ',
  WRITE: 'WRITE',
  MANAGE: 'MANAGE',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<ShareRole, readonly Permission[]> = {
  [ShareRole.VIEWER]: [Permission.READ],
};

export const ConflictStrategy = {
  FAIL: 'FAIL',
  KEEP_BOTH: 'KEEP_BOTH',
  REPLACE: 'REPLACE',
} as const;
export type ConflictStrategy = (typeof ConflictStrategy)[keyof typeof ConflictStrategy];

export const SortField = {
  NAME: 'name',
  SIZE: 'size',
  UPDATED_AT: 'updatedAt',
} as const;
export type SortField = (typeof SortField)[keyof typeof SortField];

export const SortDirection = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];
