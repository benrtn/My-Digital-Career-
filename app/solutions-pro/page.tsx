import { Metadata } from 'next'
import { SolutionsProClient } from './SolutionsProClient'

export const metadata: Metadata = {
  title: 'Solutions Pro — Carte fidélité digitale & Carte NFC | My Digital Career',
  description:
    "Digitalisez votre relation client avec une carte de fidélité digitale ou équipez vos commerciaux avec des cartes NFC modernes et personnalisées. Sans application à télécharger.",
}

export default function SolutionsProPage() {
  return <SolutionsProClient />
}
