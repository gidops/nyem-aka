import type { RoleName } from '../generated/prisma/client.js';

// What the access token carries, and what guards attach to `request.user`.
export interface AuthUser {
  id: string;
  email: string;
  role: RoleName;
}

export interface JwtPayload {
  sub: string; // user id ("subject" is the standard JWT claim name)
  email: string;
  role: RoleName;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
