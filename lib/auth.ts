/**
 * Auth utilities — password hashing + JWT token management
 *
 * Uses bcryptjs for password hashing (pure JS, no native deps).
 * Uses jose for JWT signing/verification (lightweight, Edge-compatible).
 *
 * Environment variable:
 *   JWT_SECRET — random string (min 32 chars) used to sign tokens
 */

import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const SALT_ROUNDS = 10
const TOKEN_EXPIRY = '7d'
const ADMIN_TOKEN_EXPIRY = '12h'

export const CLIENT_SESSION_COOKIE = 'mdc-client-session'
export const ADMIN_SESSION_COOKIE = 'mdc-admin-session'

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('[Auth] JWT_SECRET must be set and at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

// ── Password hashing ──────────────────────────────

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS)
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  // If the stored value doesn't look like a bcrypt hash, reject it
  // This prevents comparing against plaintext passwords from legacy data
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
    console.warn('[Auth] Stored password is not a bcrypt hash — rejecting')
    return false
  }
  return bcrypt.compare(plaintext, hash)
}

// ── JWT tokens ────────────────────────────────────

export interface ClientTokenPayload {
  sub: string // client email
  name: string
  orderId?: string
  iat: number
}

export interface AdminTokenPayload {
  sub: string
  role: 'admin'
  iat: number
}

export async function createClientToken(data: {
  email: string
  name: string
  orderId?: string
}): Promise<string> {
  const jwt = new SignJWT({
    sub: data.email,
    name: data.name,
    orderId: data.orderId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)

  return jwt.sign(getJwtSecret())
}

export async function verifyClientToken(token: string): Promise<ClientTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return {
      sub: payload.sub as string,
      name: payload.name as string,
      orderId: payload.orderId as string | undefined,
      iat: payload.iat as number,
    }
  } catch {
    return null
  }
}

export async function createAdminToken(email: string): Promise<string> {
  const jwt = new SignJWT({
    sub: email,
    role: 'admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ADMIN_TOKEN_EXPIRY)

  return jwt.sign(getJwtSecret())
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (payload.role !== 'admin' || typeof payload.sub !== 'string') {
      return null
    }

    return {
      sub: payload.sub,
      role: 'admin',
      iat: payload.iat as number,
    }
  } catch {
    return null
  }
}
