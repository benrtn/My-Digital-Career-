import { ResultsHero } from '@/components/results/ResultsHero'
import { ResultsGallery } from '@/components/results/ResultsGallery'
import { ConceptSection } from '@/components/home/ConceptSection'
import { QualityBlock } from '@/components/results/QualityBlock'
import { ResultsCTA } from '@/components/results/ResultsCTA'

export default function ResultsPage() {
  return (
    <>
      <ResultsHero />
      <ResultsGallery />
      <ConceptSection />
      <QualityBlock />
      <ResultsCTA />
    </>
  )
}
