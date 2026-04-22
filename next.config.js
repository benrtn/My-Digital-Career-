/** @type {import('next').NextConfig} */

const securityHeaders = [
  // HSTS — enforce HTTPS for 1 year, include subdomains
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  // Block MIME-type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Limit referrer info
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Restrict browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Content-Security-Policy
  // Notes:
  //  - 'unsafe-inline' for scripts is required by Next.js hydration and framer-motion
  //  - Google Tag Manager is conditionally loaded after analytics consent
  //  - Apps Script domains are needed for admin/chat/order API calls made client-side
  //  - If you later enable a nonce-based CSP, remove 'unsafe-inline' from script-src
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
      // Apps Script: client-side calls from admin / chat / orders go directly to script.google.com
      "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://script.google.com https://script.googleusercontent.com",
      "frame-src 'self'",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
