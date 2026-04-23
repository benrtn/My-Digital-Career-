import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { CookieConsentProvider } from '@/contexts/CookieConsentContext'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { ConsentAwareAnalytics } from '@/components/legal/ConsentAwareAnalytics'
import { CookieBanner } from '@/components/legal/CookieBanner'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'My Digital Career — Votre CV devient un site web professionnel',
  description:
    'Transformez votre CV en un site web professionnel, élégant et mémorable. Partageable en un lien. À partir de 20 €, paiement unique.',
  keywords: ['E-CV', 'CV professionnel', 'site web CV', 'portfolio digital', 'My Digital Career', 'CV en ligne'],
  openGraph: {
    title: 'My Digital Career — Votre CV devient un site web professionnel',
    description: 'Un CV classique ne suffit plus. Passez au E-CV : un site web premium, partageable en un lien.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        {/* Preload hero images */}
        <link rel="preload" href="/creation/siteazzeddine.webp" as="image" type="image/webp" />
        <link rel="preload" href="/creation/siteben.webp" as="image" type="image/webp" />
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <CookieConsentProvider>
            <Header />
            <main>{children}</main>
            <ChatWidget />
            <Footer />
            <CookieBanner />
            <ConsentAwareAnalytics />
          </CookieConsentProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
