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

export const LEGAL: Record<'privacy' | 'terms' | 'refund' | 'deleteAccount', LegalDoc> = {
  privacy: {
    title: 'Privacy policy',
    updated: '31 October 2026',
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
      {
        heading: 'The Klytos School mobile app',
        body: [
          'The Klytos School app (Android) is the same ERP on a phone. People sign in with the login their school gives them; the app shows only what their role allows.',
          'Location: only while the app is open, and only for the features a school turns on: the school bus driver’s live position (shown to the parents of students on that bus) and staff check-in at the school. The app does not track location in the background.',
          'Camera, photos and files: only when you choose to, to scan ID cards, book labels or passes, take a photo (for example a student’s ID-card photo or a visitor’s photo) or attach a document. They are sent to your school’s records.',
          'Notifications: the app uses Firebase Cloud Messaging (Google) to deliver the school’s notifications to your phone; it keeps a notification token for your device, removed when you sign out.',
          'AI assistant and AI learning: questions you type are sent, with the school records needed to answer them, to the school’s AI provider (for example Google Gemini) to write the answer. Answers come only from what you are allowed to see; conversations are kept so you can read them again, and you can delete them.',
          'The app has no ads, and we do not sell personal data or use it for advertising.',
        ],
      },
      {
        heading: 'Deleting your account',
        body: ['You can ask for your login account and personal data to be deleted at any time. How to ask, and what is deleted or kept, is explained on our Delete your account page (/delete-account).'],
      },
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
  deleteAccount: {
    title: 'Delete your account and data',
    updated: '31 October 2026',
    sections: [
      {
        heading: 'Which app',
        body: [`This page is for the Klytos School app on Google Play (published by SarthakSetu Technology) and the ${SITE.product} website, both run by ${SITE.company}. Accounts are created by your school; the school is responsible for the records it keeps about its students, parents and staff.`],
      },
      {
        heading: 'How to ask',
        body: [
          'Option 1: ask your school office to close your login. The school can do it at once.',
          `Option 2: write to us at ${SITE.email} with the subject “Delete my account”, giving your name, your school, your login (phone number or username) and whether you are a parent, student or staff member. We confirm it is you (usually through your school) and reply within 7 days.`,
        ],
      },
      {
        heading: 'What is deleted',
        body: ['Your login account and password, your profile photo, the notification tokens of your phones, your AI assistant conversations and your saved settings. You are signed out of every device.'],
      },
      {
        heading: 'What the school may keep',
        body: ['Some records belong to the school and must be kept by law or for the school’s own records, for example fee receipts and payments (accounting rules), attendance, marks and certificates. These are kept by the school, without your login, for as long as the law requires, and are deleted when the school leaves the service and its notice period ends.'],
      },
      {
        heading: 'How long it takes',
        body: ['Your account is closed within 30 days of a confirmed request. Copies in our encrypted nightly backups are overwritten within a further 30 days.'],
      },
      {
        heading: 'Deleting only some data',
        body: ['You can delete AI assistant conversations yourself in the app. For other data, write to us as above and say what you want removed.'],
      },
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
