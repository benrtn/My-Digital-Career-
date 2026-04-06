import type { ClientSiteAccess } from '@/types'

export const clientSiteAccess: ClientSiteAccess[] = [
  {
    id: 'azzeddine',
    name: 'Azzeddine',
    email: 'azzeddine@mydigitalcareer.fr',
    password: 'azzeddine2026',
    siteUrl: 'https://stunning-basbousa-290e1e.netlify.app/',
    previewImagePath: '/creation/siteazzeddine.webp',
    downloadPath: '/clients-sites/azzeddine-site.zip',
  },
  {
    id: 'manon',
    name: 'Manon',
    email: 'manon@mydigitalcareer.fr',
    password: 'manon2026',
    siteUrl: 'https://manon-moinse.netlify.app/',
    previewImagePath: '/creation/sitemanon.webp',
    downloadPath: '/clients-sites/manon-site.zip',
  },
  {
    id: 'meen',
    name: 'Meen',
    email: 'meen@mydigitalcareer.fr',
    password: 'meen2026',
    siteUrl: 'https://stunning-basbousa-290e1e.netlify.app/',
    previewImagePath: '/creation/sitemeen.webp',
    downloadPath: '/clients-sites/meen-site.zip',
  },
  {
    id: 'remi',
    name: 'Remi',
    email: 'remi@mydigitalcareer.fr',
    password: 'remi2026',
    siteUrl: 'https://remi-pavol.netlify.app/',
    previewImagePath: '/creation/siteremi.webp',
    downloadPath: '/clients-sites/remi-site.zip',
  },
  {
    id: 'benjamin',
    name: 'Benjamin',
    email: 'benjamin@mydigitalcareer.fr',
    password: 'benjamin2026',
    siteUrl: 'https://benjamin-ikhmim.netlify.app/',
    previewImagePath: '/creation/siteben.webp',
    downloadPath: '/clients-sites/benjamin-site.zip',
  },
]

export function findClientSiteAccess(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  return clientSiteAccess.find(
    (account) =>
      account.email.toLowerCase() === normalizedEmail &&
      account.password === password
  ) ?? null
}

export function findClientSiteAccessByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  return clientSiteAccess.find(
    (account) => account.email.toLowerCase() === normalizedEmail
  ) ?? null
}
