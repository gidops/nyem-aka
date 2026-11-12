import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route as open to signed-out callers. Without it, JwtAuthGuard demands a token.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
