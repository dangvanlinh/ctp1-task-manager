import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export const API_TOKEN_PREFIX = 'ctp1_';

export interface JwtUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

export interface ApiTokenAuth {
  id: string;
  name: string;
  projectId: string | null;
  scope: 'read' | 'write';
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateApiToken() {
  const random = crypto.randomBytes(24).toString('hex'); // 48 hex chars
  const token = API_TOKEN_PREFIX + random;
  const prefix = token.slice(0, 12); // "ctp1_xxxxxx" — safe to display
  return { token, prefix, hash: hashToken(token) };
}

// Middleware: verify JWT or API token
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  // Branch 1: API token
  if (token.startsWith(API_TOKEN_PREFIX)) {
    const hash = hashToken(token);
    const apiToken = await prisma.apiToken.findUnique({ where: { tokenHash: hash } });
    if (!apiToken) throw new HTTPException(401, { message: 'Invalid API token' });
    if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
      throw new HTTPException(401, { message: 'API token expired' });
    }
    // Update lastUsedAt (fire and forget — don't await to keep latency low)
    prisma.apiToken.update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    c.set('apiToken', {
      id: apiToken.id,
      name: apiToken.name,
      projectId: apiToken.projectId,
      scope: apiToken.scope as 'read' | 'write',
    } as ApiTokenAuth);
    await next();
    return;
  }

  // Branch 2: JWT
  try {
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

// Middleware factory: check roles. API tokens are NOT allowed through this guard.
export function rolesGuard(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JwtUser | undefined;
    if (!user || !roles.includes(user.role)) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }
    await next();
  };
}

// Middleware factory: allow API tokens (scoped to projectId in query / param) alongside JWT users.
// Use on read-only endpoints that expose project data to bots.
export function allowApiToken(opts: { projectIdFrom: 'query' | 'param'; key: string }) {
  return async (c: Context, next: Next) => {
    const apiToken = c.get('apiToken') as ApiTokenAuth | undefined;
    if (!apiToken) {
      // JWT user path — continue without extra check
      await next();
      return;
    }
    const projectId =
      opts.projectIdFrom === 'query' ? c.req.query(opts.key) : c.req.param(opts.key);
    if (apiToken.projectId && apiToken.projectId !== projectId) {
      throw new HTTPException(403, { message: 'API token not scoped to this project' });
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
