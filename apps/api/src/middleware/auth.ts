import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface JwtUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

// Middleware: verify JWT and attach user to context
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as any;
    c.set('user', {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    } as JwtUser);
    await next();
  } catch {
    throw new HTTPException(401, { message: 'Invalid token' });
  }
}

// Middleware factory: check roles
export function rolesGuard(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JwtUser;
    if (!user || !roles.includes(user.role)) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }
    await next();
  };
}

// Generate JWT tokens
export function generateTokens(userId: string, email: string, role: string, name: string) {
  const payload = { sub: userId, email, role, name };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '90d' });
  return { accessToken, refreshToken };
}
