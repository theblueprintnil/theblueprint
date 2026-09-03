import type { Metadata } from 'next'

import { LegalDocument } from '@/components/brand/LegalDocument'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How The Blueprint collects, protects, and deletes athlete and brand data.',
}

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="September 1, 2026"
      intro="This policy explains what data The Blueprint processes for athletes, brands, guardians, and their partners; how it is classified and protected; and the controls available to tenants and individuals."
      sections={[
        {
          heading: 'Data we process',
          paragraphs: [
            'Account data such as name, email, and authentication identifiers; profile data such as sport, school, and public biography for athletes and company information for brands; commercial data such as campaigns, deals, contracts, and approvals; and usage data such as audit events and access logs.',
            'We never store raw payment card data. Payment processing is handled by Stripe.',
          ],
        },
        {
          heading: 'Data classification',
          paragraphs: [
            'Data is classified as public, confidential, restricted, or highly restricted. Restricted classes, including minors\u2019 information, guardianship records, and contracts, receive least-privilege access, private storage, and audited distribution.',
          ],
        },
        {
          heading: 'Protection measures',
          paragraphs: [
            'Tenant isolation is enforced through row-level security keyed to organization membership. Sensitive documents are stored privately and distributed only through server-authorized controls. Sensitive actions are recorded in append-only audit events.',
          ],
        },
        {
          heading: 'Public marketplace data',
          paragraphs: [
            'Profile data you choose to publish in the athlete directory is visible to registered brands and the public. You can unpublish or limit visibility at any time from your profile settings. Inquiries sent through the marketplace are shared only with the recipient.',
          ],
        },
        {
          heading: 'Retention and deletion',
          paragraphs: [
            'Trials that do not convert retain data for a defined grace window before deletion or anonymization. Canceled subscriptions follow the published retention schedule. Tenants and individuals may request deletion; we honor requests except where retention is legally required.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            'Privacy questions and data requests can be directed to our privacy contact published on the security page.',
          ],
        },
      ]}
    />
  )
}
