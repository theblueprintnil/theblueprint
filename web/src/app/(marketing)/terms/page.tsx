import type { Metadata } from 'next'

import { LegalDocument } from '@/components/brand/LegalDocument'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing use of The Blueprint NIL operating platform.',
}

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      updated="September 1, 2026"
      intro="These terms govern access to and use of The Blueprint platform. By creating an account or workspace, you accept these terms on behalf of the business entity you represent."
      sections={[
        {
          heading: 'Service description',
          paragraphs: [
            'The Blueprint is a software platform that provides profile, marketplace, campaign, deal, contract, and approval tooling for athletes, brands, guardians, and representation businesses. The platform is an operational tool, not a law firm, agent, financial advisor, or compliance authority.',
            'NCAA, conference, school, league, and state NIL determinations remain the responsibility of qualified professionals. Platform features never substitute for legal review.',
          ],
        },
        {
          heading: 'Accounts and workspaces',
          paragraphs: [
            'Each workspace represents a single business entity. You are responsible for the accuracy of the information you provide, for seat assignments, and for the permissions you grant to members.',
            'Trials require a payment method and convert automatically to a paid subscription unless canceled before the trial ends. Billing is processed by Stripe; entitlement changes follow verified webhook events only.',
          ],
        },
        {
          heading: 'Marketplace conduct',
          paragraphs: [
            'You may not publish misleading profile information, misrepresent athlete eligibility or verification status, bypass guardian consent requirements, or automate acceptance of offers or contracts without human review.',
            'Athletes control what appears in their directory profile. Brands must use profile data only for legitimate campaign purposes described in these terms.',
          ],
        },
        {
          heading: 'Acceptable use',
          paragraphs: [
            'You may not use the platform to publish unlawful content, to misrepresent athlete eligibility, or to bypass disclosure requirements. Automated generation must never bypass compliance disclaimers or human sign-off requirements.',
          ],
        },
        {
          heading: 'Data and confidentiality',
          paragraphs: [
            'You retain ownership of content and data you upload. We process tenant data under row-level isolation, private storage controls, and immutable audit logging as described in our security documentation.',
            'Restricted data classes, including contracts and minors\u2019 information, must not be shared through public channels outside the platform\u2019s controlled sharing features.',
          ],
        },
        {
          heading: 'Limitation of liability',
          paragraphs: [
            'The platform is provided on an as-is basis. To the maximum extent permitted by law, we are not liable for indirect or consequential damages arising from use of the service, including deal outcomes or compliance determinations.',
          ],
        },
        {
          heading: 'Changes and termination',
          paragraphs: [
            'We may update these terms with notice. You may cancel a subscription at any time through the billing portal; data retention after cancellation follows our published retention policy.',
          ],
        },
      ]}
    />
  )
}
