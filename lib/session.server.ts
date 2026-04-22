import {
  ADMIN_SESSION_COOKIE,
  CLIENT_SESSION_COOKIE,
  verifyAdminToken,
  verifyClientToken,
} from '@/lib/auth'

function getCookieValue(request: Request, name: string): string | null {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)

  return value ? decodeURIComponent(value) : null
}

export async function getAdminSessionFromRequest(request: Request) {
  const token = getCookieValue(request, ADMIN_SESSION_COOKIE)
  return token ? verifyAdminToken(token) : null
}

export async function getClientSessionFromRequest(request: Request) {
  const token = getCookieValue(request, CLIENT_SESSION_COOKIE)
  return token ? verifyClientToken(token) : null
}

export function getRequiredAdminKey(): string {
  const adminKey = process.env.ADMIN_SECRET_KEY?.trim()
  if (!adminKey) {
    throw new Error('ADMIN_SECRET_KEY not configured')
  }
  return adminKey
}
