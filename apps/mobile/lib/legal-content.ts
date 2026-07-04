// Canonical legal content for the Lenda mobile app.
//
// TERMS_SECTIONS and PRIVACY_SECTIONS are ported verbatim from the web app's
// legal pages:
//   - apps/web/src/pages/TermsPage.tsx    (its `sections` array)
//   - apps/web/src/pages/PrivacyPage.tsx  (its `sections` array)
//
// Web and mobile ship on separate build pipelines, so this content is
// co-located here rather than imported from a shared package. It MUST be kept
// in sync manually with the two web files above: any change to the legal
// wording on web has to be mirrored here (and vice versa). Once the wording
// stabilises and the sync cost is worth it, this should move into a shared
// @lenda/legal workspace package consumed by both web and mobile.
//
// PRIVACY_SECTIONS additionally contains two mobile-specific sections
// ("Mobile App Data and Permissions" and "Camera and Photo Access") that do
// not exist on web, inserted before the final "Contact and Data Requests"
// entry. Those are the only intentional divergences from the web content.

export type LegalSection = {
  title: string;
  content: string;
};

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "Acceptance of Terms",
    content: `By creating an account or using the Lenda platform, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you may not use Lenda. These terms apply to all users including guests, hosts, and visitors. Lenda is operated by Quantic Engineering Limited (Registration Number 120261048940), a company registered in Zambia under PACRA, with its registered office in Lusaka, Zambia.`,
  },
  {
    title: "User Accounts and Eligibility",
    content: `You must be at least 18 years old to create an account on Lenda. Hosts must be resident in Zambia and complete identity (KYC) verification before listing. By registering, you confirm that the information you provide is accurate and that you have the legal capacity to enter into contracts under Zambian law. You are responsible for safeguarding your account credentials and for all activity that occurs under your account. One person may hold only one account; creating multiple accounts to circumvent restrictions is prohibited.`,
  },
  {
    title: "Host Responsibilities",
    content: `Hosts are responsible for ensuring their listings are accurate, legally compliant, and safe. Hosts must complete KYC verification before creating listings. Hosts must honour confirmed bookings and respond to guest inquiries within a reasonable time. Hosts may not list items they do not own or have permission to rent, and must hold any licences required to provide their listed services. Fraudulent or misleading listings will result in immediate account suspension.`,
  },
  {
    title: "Guest Responsibilities",
    content: `Guests must treat rented items and service providers with care and respect. Guests are responsible for returning rented items in the same condition they were received, allowing for reasonable wear. Guests must confirm handover honestly and may not make false damage or dispute claims. Guests must provide accurate pickup information and attend bookings at the agreed time.`,
  },
  {
    title: "Listing Rules",
    content: `Listings must accurately describe the item or service, its condition, pricing, and availability. Photos must depict the actual item or service offered. Pricing must be transparent and inclusive of any mandatory fees. Listings must comply with all applicable Zambian laws and may not be used to advertise off-platform transactions designed to avoid Lenda's fees. Lenda may remove or edit any listing that breaches these rules.`,
  },
  {
    title: "Booking, Price Lock and Payments",
    content: `When a booking is confirmed, the price displayed at the time of booking creation is locked and cannot be changed by either party. Lenda facilitates the connection between hosts and guests but is not a party to the rental or service agreement. Hosts on the FREE plan pay 15% commission on completed bookings and PRO hosts pay 10%, deducted automatically from the host's float balance. The first 2 completed bookings for each host are commission-free.`,
  },
  {
    title: "Cancellation Policy",
    content: `Either party may cancel a booking before it reaches the ACTIVE status without penalty. Once a booking is active, cancellations require mutual agreement between the parties or administrative intervention by Lenda. Repeated last-minute cancellations may affect a user's standing on the platform. Refunds, where applicable, are processed to the original payment method or float balance in accordance with the outcome of the booking.`,
  },
  {
    title: "Prohibited Items and Services",
    content: `You may not list, book, or exchange anything illegal under Zambian law. Prohibited items and services include, without limitation: firearms, ammunition, explosives and weapons; illegal drugs, controlled substances and related paraphernalia; stolen or counterfeit goods; live animals and protected wildlife products; hazardous, toxic or radioactive materials; sexual or adult services; and any item or service requiring a licence that the host does not hold. Lenda may remove such listings and report serious violations to the relevant authorities.`,
  },
  {
    title: "Prohibited Conduct",
    content: `You may not harass, threaten, or defraud other users. You may not create multiple accounts to circumvent restrictions. You may not reverse-engineer, scrape, or attempt to gain unauthorised access to the platform. Violations may result in permanent account termination and reporting to relevant authorities.`,
  },
  {
    title: "Dispute Resolution",
    content: `All booking disputes must be raised within 24 hours of completion through the platform's dispute process. Both parties are expected to communicate in good faith and provide supporting evidence such as photos, messages, and handover records. Disputed bookings are reviewed by Lenda administrators, who will make a determination based on the evidence provided. Lenda's decision on platform disputes is final. Disputes that cannot be resolved internally may be referred to the courts of Zambia as set out below.`,
  },
  {
    title: "Limitation of Liability",
    content: `Lenda is a marketplace platform and is not liable for the condition of listed items, the quality of services delivered, or disputes between hosts and guests. We do not guarantee availability of listings or uninterrupted access to the platform. To the maximum extent permitted by Zambian law, the liability of Quantic Engineering Limited to any user is limited to the commission earned on the relevant transaction, and we exclude liability for indirect or consequential loss.`,
  },
  {
    title: "Account Termination",
    content: `We reserve the right to suspend or terminate any account that violates these terms, engages in fraudulent activity, or poses a risk to other users or the platform. You may close your account at any time by contacting support@lenda.work. Outstanding float balances will be withdrawn to your registered mobile money number within 7 business days of account closure.`,
  },
  {
    title: "Governing Law",
    content: `These terms are governed by and construed in accordance with the laws of the Republic of Zambia. Any disputes arising from the use of Lenda that cannot be resolved through our internal dispute process shall be subject to the exclusive jurisdiction of the courts of Zambia.`,
  },
  {
    title: "Contact",
    content: `For questions about these terms, contact us at legal@lenda.work or write to Quantic Engineering Limited (Reg No. 120261048940), Lusaka, Zambia.`,
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "Data Controller",
    content: `Lenda is operated by Quantic Engineering Limited (Registration Number 120261048940), a company registered in Zambia under PACRA with its registered office in Lusaka, Zambia. For the purposes of the Data Protection Act No. 3 of 2021 of the Republic of Zambia ("DPA 2021"), Quantic Engineering Limited is the data controller responsible for your personal data. This policy explains what we collect, why we collect it, how we use and store it, and the rights you have over it.`,
  },
  {
    title: "Categories of Data We Collect",
    content: `We collect the following categories of personal data: (1) email address; (2) phone number; (3) full name; (4) profile photo; (5) KYC verification documents, comprising your national identity document, proof of residence, and a recent photograph; (6) location information; (7) device tokens used for push notifications; (8) booking history; and (9) payment information. We only collect the data necessary to operate the platform and verify the people who use it.`,
  },
  {
    title: "Why We Collect Each Category and How We Use It",
    content: `Email is used to create and secure your account, send verification links, booking updates, and service notices. Phone number is used for account contact, two-party booking coordination, and mobile money payouts. Full name and profile photo identify you to the hosts and guests you transact with and build trust on the platform. KYC documents (national ID, proof of residence, recent photo) are used solely to verify your identity and prevent fraud, as required to operate a marketplace responsibly. Location is used to show relevant nearby listings and to coordinate pickups. Device tokens are used to deliver push notifications you have enabled. Booking history is used to provide your transaction records, resolve disputes, and meet financial record-keeping obligations. Payment information is used to process commission, manage your float balance, and make payouts. We do not sell your personal data, and we process it only for the lawful purposes described here.`,
  },
  {
    title: "How and Where Your Data Is Stored",
    content: `KYC and other uploaded documents are stored as encrypted objects on Cloudflare R2. Your account and platform data — including your profile, bookings, and payment records — are stored in a PostgreSQL database hosted on Oracle Cloud Infrastructure. Data is encrypted in transit and at rest, access is restricted to authorised personnel, and passwords are hashed and never stored in plain text.`,
  },
  {
    title: "Third-Party Sharing",
    content: `We share limited personal data only where necessary to operate the platform. Hosts and guests see the names, profile photos, and contact details needed to complete a booking. We use Resend to deliver transactional and account emails, which involves sharing your email address and message content. We use Cloudflare R2 to store your documents and uploads. These providers act as our data processors under written terms and may not use your data for their own purposes. We will also disclose personal data where required by Zambian law or a valid legal order.`,
  },
  {
    title: "Data Retention",
    content: `We retain your personal data for as long as your account is active. KYC documents for rejected applications are deleted promptly; approved KYC documents are retained for the life of your account for legal and compliance purposes. If you close your account, we delete your personal data within 30 days, except where longer retention is required by law. Transaction and booking records are retained for 7 years in accordance with Zambian financial and tax regulations, after which they are deleted or anonymised.`,
  },
  {
    title: "Your Rights Under the DPA 2021",
    content: `Under the Data Protection Act 2021, you have the right to access the personal data we hold about you, to request correction of inaccurate or incomplete data, and to request deletion of your data where it is no longer required and retention is not mandated by law. You may also object to or restrict certain processing and request a copy of your data in a portable form. You can update much of your information directly from your dashboard. To exercise any of these rights, contact us using the details below; we will respond within the timeframes set by the DPA 2021 and in any case within 14 business days.`,
  },
  {
    title: "Security",
    content: `We use industry-standard encryption for data in transit and at rest. Passwords are hashed and never stored in plain text. Access tokens are short-lived and rotated on every session, and access to KYC documents is limited to authorised administrators. Despite these measures, no system is perfectly secure, and we encourage you to use a strong, unique password and keep your account credentials confidential.`,
  },
  {
    title: "Changes to This Policy",
    content: `We may update this policy from time to time. When we make significant changes, we will notify you via email or an in-app notification. Continued use of Lenda after changes take effect constitutes your acceptance of the updated policy.`,
  },
  {
    title: "Mobile App Data and Permissions",
    content: `When you use the Lenda mobile app, the app may ask for permission to send you push notifications so we can alert you about booking updates such as confirmations, handovers, and status changes. Granting this permission is optional: you may decline, and the core features of the app continue to work without it. If you decline, no device push token is collected. Your login session — the access and refresh tokens that keep you signed in — is stored using your device's secure, hardware-backed storage (the iOS Keychain or the Android Keystore, accessed through Expo SecureStore) and is not accessible to other apps on your device. If you enable notifications, a device push token is generated and associated with your account for the sole purpose of delivering booking-related alerts; it is never used for advertising. When you sign out, your stored session is cleared from the device and the app stops using the token, and uninstalling the app removes it from your device. You may also request deletion of any device token held against your account at any time using the contact details below.`,
  },
  {
    title: "Camera and Photo Access",
    content: `Identity verification (KYC) document upload and profile photo upload are not yet available in the Lenda mobile app, and the app does not currently request camera or photo library access. When these features are introduced, Lenda will request access to your camera or photo library only at the moment you choose to upload an identity verification document or a profile photo — never in the background — and solely to let you capture or select the specific image you are uploading. Declining camera or photo library access will mean you cannot complete those specific actions, but you can continue to use the rest of the app normally.`,
  },
  {
    title: "Contact and Data Requests",
    content: `For privacy questions or to make a data access, correction, or deletion request, contact our data protection contact at privacy@lenda.work, or write to Quantic Engineering Limited (Reg No. 120261048940), Lusaka, Zambia. You also have the right to lodge a complaint with the Office of the Data Protection Commissioner of Zambia.`,
  },
];
