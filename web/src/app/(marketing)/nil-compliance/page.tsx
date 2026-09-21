import type { Metadata } from 'next'

import { LegalDocument } from '@/components/brand/LegalDocument'

export const metadata: Metadata = {
  title: 'NIL Compliance',
  description:
    'NCAA and state NIL compliance disclosure guidelines for athletes and brands on The Blueprint.',
}

export default function NilCompliancePage() {
  return (
    <LegalDocument
      title="NIL Compliance & Disclosure Guidelines"
      updated="September 1, 2026"
      intro="This page summarizes the compliance framework The Blueprint uses to keep athlete-brand engagements organized and disclosure-ready. It is informational only and is not legal advice. Eligibility determinations remain the responsibility of qualified professionals at the school, conference, and governing-body level."
      sections={[
        {
          heading: 'Who sets the rules',
          paragraphs: [
            'Name, image, and likeness rules are set at multiple levels: NCAA policy, each school\u2019s institutional policy, conference rules, state statutes, and applicable federal law. These can differ and change. Always confirm the rules that apply to a specific athlete and state.',
          ],
        },
        {
          heading: 'Verification on the platform',
          paragraphs: [
            'Athlete profiles surface self-reported school, sport, and eligibility context. Verified badges indicate identity confirmation steps taken on the platform — they are not a determination that a specific activity is permissible. Brands should independently confirm eligibility before contracting.',
          ],
        },
        {
          heading: 'Disclosure obligations',
          paragraphs: [
            'Many schools and states require athletes to disclose NIL activities. The Blueprint provides required-tag workflows and disclosure reminders, but it does not file or submit disclosures on your behalf. Confirm your school\u2019s submission process and deadlines.',
          ],
        },
        {
          heading: 'Guardian consent for minors',
          paragraphs: [
            'For athletes under 18, commercial activity requires consent from a parent or legal guardian. The platform supports guardian-linked accounts and approval queues; automated processes never bypass guardian consent.',
          ],
        },
        {
          heading: 'What The Blueprint never does',
          paragraphs: [
            'The Blueprint never makes eligibility determinations, never claims an activity is NCAA-compliant, never provides legal or tax advice, and never automates the acceptance of offers or signature of contracts without human review. Features like readiness scores describe profile completeness, not compliance.',
          ],
        },
        {
          heading: 'State law variations',
          paragraphs: [
            'State NIL laws vary widely in areas such as contract disclosure windows, professional representation rules, and sport-specific restrictions. Use the platform\u2019s state context notes as reminders, and engage qualified counsel for definitive answers.',
          ],
        },
        {
          heading: 'Reporting concerns',
          paragraphs: [
            'If you believe a profile or deal on the platform misrepresents eligibility or bypasses consent or disclosure requirements, report it from the deal or profile page. The platform team reviews reports and may suspend or remove content that violates these guidelines.',
          ],
        },
      ]}
    />
  )
}
