import { Hero } from '@/components/home/Hero'
import { HowItWorksSection } from '@/components/home/HowItWorksSection'
import { OfferSection } from '@/components/home/OfferSection'
import { BenefitsSection } from '@/components/home/BenefitsSection'
import { ContactSection } from '@/components/home/ContactSection'

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorksSection />
      <OfferSection />
      <BenefitsSection />
      <ContactSection />
    </>
  )
}
