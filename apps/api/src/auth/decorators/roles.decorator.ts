import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '../../generated/prisma/client.js';

export const ROLES_KEY = 'roles';

// Restricts a route (or a whole controller) to the listed roles: @Roles('ADMIN')
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
