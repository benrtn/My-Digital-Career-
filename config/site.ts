export const siteConfig = {
  name: 'My Digital Career',
  tagline: 'Votre image professionnelle, réinventée.',
  price: 20,
  currency: '€',
  deliveryDays: '1',

  // Contact email
  contactEmail: 'mydigitalcareer.support@gmail.com',

  legal: {
    operator: 'Benjamin Ikhmim',
    businessStatus: 'Micro-entreprise',
    address: '12 avenue Louis Deneux 80330 Cagny',
    host: 'GitHub Pages',
    domain: 'insérer nom de domaine',
    siret: 'insérer le numéro de siret ici',
    service: 'Création d’un E-CV / portfolio numérique personnalisé',
    firstDelivery: 'Première version fonctionnelle sous 24h',
    meetSession: 'Visio de 30 minutes pour améliorer le rendu avec le client',
    finalDelivery: 'Version finale délivrée en principe 2h après le rendez-vous Meet',
    noShowRule: 'En cas d’absence au rendez-vous, une seule seconde réservation est possible',
    freeEdits: 'Modifications gratuites pendant 7 jours',
    responseTime: 'Délai de réponse indicatif d’environ 3 heures',
    retention: 'Suppression des données 30 jours après la livraison finale',
  },
}

export function getLocalizedPrice(lang: 'fr' | 'en' | 'th') {
  if (lang === 'th') {
    return {
      amount: '740',
      currency: '฿',
      inline: '740฿',
    }
  }

  return {
    amount: String(siteConfig.price),
    currency: siteConfig.currency,
    inline: `${siteConfig.price}${siteConfig.currency}`,
  }
}
