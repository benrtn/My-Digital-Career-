export const LEGAL_PLACEHOLDERS = {
  cgv: '{{CGV_CONTENT}}',
  legalNotice: '{{LEGAL_NOTICE_CONTENT}}',
  privacyPolicy: '{{PRIVACY_POLICY_CONTENT}}',
} as const

export const cookieContent = {
  intro:
    'My Digital Career utilise des cookies et technologies similaires pour assurer le fonctionnement du site, mesurer son audience et préparer l’intégration de solutions de paiement sécurisées.',
  explanation: [
    'Les cookies strictement nécessaires garantissent le bon fonctionnement du site et ne peuvent pas être désactivés.',
    'La mesure d’audience permet d’analyser la fréquentation et les parcours utilisateurs, notamment via Google Analytics, uniquement si vous l’acceptez.',
    'Des services de paiement sécurisés comme Stripe et PayPal peuvent être utilisés sur le site. Les cookies associés sont activés uniquement si vous autorisez la catégorie correspondante.',
    'Vous pouvez accepter, refuser ou personnaliser vos choix, puis modifier vos préférences à tout moment depuis le bouton “Gestion des cookies”.',
  ],
  categories: [
    {
      id: 'necessary',
      title: 'Cookies strictement nécessaires',
      description:
        'Indispensables au fonctionnement du site, à la sécurité, à la navigation et à l’accès aux services essentiels.',
    },
    {
      id: 'analytics',
      title: 'Mesure d’audience',
      description:
        'Permet d’analyser les visites, le trafic et les interactions afin d’améliorer le site. Conçu pour piloter Google Analytics uniquement avec votre accord.',
    },
    {
      id: 'payments',
      title: 'Paiement sécurisé',
      description:
        'Prévu pour les intégrations Stripe et PayPal. À activer si vous acceptez l’usage de ces services lors d’un paiement ou d’une transaction.',
    },
  ],
} as const
