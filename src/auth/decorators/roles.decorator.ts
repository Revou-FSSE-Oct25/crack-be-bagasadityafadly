import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

// Custom decorator that marks which roles are allowed on a route
// Usage: @Roles(Role.ADMIN) or @Roles(Role.ADMIN, Role.MEMBER)
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);