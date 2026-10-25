import { SITE } from './content';

/**
 * The website's legal pages (English; the Hindi pages show the same text with a note). A starting
 * point written for Klytos Labs: have them reviewed before relying on them, and add the business
 * address when there is one.
 */

export interface LegalDoc {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}

const contact = `${SITE.company}, ${SITE.email}, ${SITE.phone}`;

export const LEGAL: Record<'privacy' | 'terms' | 'refund', LegalDoc> = {
  privacy: {
    title: 'Privacy policy',
    updated: '25 October 2026',
    sections: [
      { heading: 'Who we are', body: [`${SITE.product} is made by ${SITE.company} ("we", "us"). This policy explains what personal data we handle, why, and your choices. Contact: ${contact}.`] },
      {
        heading: 'Two kinds of data',
        body: [
          'Website visitors: when you book a demo or contact us, we keep the details you give (name, school, phone, email, city, number of students and your message) to reply to you and arrange a demo.',
          'Schools using the ERP: the school decides what data about students, parents and staff is kept in its ERP and why. For that data the school is responsible (the "data fiduciary"), and we process it only on the school’s behalf and on its instructions.',
        ],
      },
      { heading: 'How we use data', body: ['To provide, secure and support the ERP; to reply to enquiries and arrange demos; to send service messages (for example, sign-in or payment emails); and to meet legal obligations. We do not sell personal data, and we do not use a school’s data for advertising.'] },
      { heading: 'Sharing', body: ['We use trusted service providers to run the ERP (hosting, email, SMS and payment gateways such as Razorpay). They process data only to provide their service to us. We may share data when the law requires it.'] },
      { heading: 'Where and how long', body: ['School data is stored in India. A school’s data is kept while it uses the ERP; when it leaves, it can take a copy, and the data is deleted after a notice period. Demo enquiries are kept for up to two years unless you ask us to delete them sooner.'] },
      { heading: 'Security', body: ['Each school’s data is kept apart from every other school’s, access depends on each person’s role, passwords are stored encrypted, two-factor sign-in is available, changes are recorded and data is backed up every night.'] },
      { heading: 'Your rights', body: ['You may ask to see, correct or delete your personal data, or withdraw consent. Students, parents and staff of a school should contact their school first; we help the school act on the request. Write to us at the contact above.'] },
      { heading: 'Changes', body: ['We may update this policy; the date above shows the latest version.'] },
    ],
  },
  terms: {
    title: 'Terms of use',
    updated: '25 October 2026',
    sections: [
      { heading: 'Agreement', body: [`These terms apply to the ${SITE.product} website and to schools using the ERP. A school’s order or agreement with ${SITE.company} may add to them; where they differ, the agreement applies.`] },
      { heading: 'The service', body: ['We provide the ERP as an online service, with the modules and limits of the school’s plan. We work to keep it available and secure, and may improve or change features over time.'] },
      { heading: 'The school’s responsibilities', body: ['The school is responsible for the data it enters, for having the right to use it (including consent where needed), for who it gives logins to, and for keeping passwords safe. Users must not misuse the service, try to reach data they are not allowed to see, or disrupt it.'] },
      { heading: 'Fees', body: ['Charges are as agreed in the school’s quote or order, usually per student per year. Taxes apply as per law. Unpaid charges may lead to the service being paused after notice.'] },
      { heading: 'Data and leaving', body: ['The school’s data belongs to the school. When a school leaves, it can export its data; after a notice period the data is deleted.'] },
      { heading: 'Liability', body: ['The service is provided with reasonable care. To the extent the law allows, our liability is limited to the charges paid by the school for the twelve months before the claim, and we are not liable for indirect losses.'] },
      { heading: 'Law', body: ['These terms are governed by the laws of India.'] },
      { heading: 'Contact', body: [contact] },
    ],
  },
  refund: {
    title: 'Refund and cancellation',
    updated: '25 October 2026',
    sections: [
      { heading: 'Subscriptions', body: ['A school can cancel its subscription by writing to us. The service continues until the end of the period already paid for. Charges for a period that has started are not refunded, unless the school’s agreement says otherwise.'] },
      { heading: 'Charges made by mistake', body: ['If you were charged twice or by mistake, write to us within 30 days with the payment details. Confirmed mistakes are refunded to the original payment method within 7–10 working days.'] },
      { heading: 'School fees paid by parents', body: ['Fees that parents pay to a school through the ERP (for example, tuition fees by UPI or card) are paid to the school. Refunds of those fees follow the school’s own rules: please contact the school.'] },
      { heading: 'Contact', body: [contact] },
    ],
  },
};
