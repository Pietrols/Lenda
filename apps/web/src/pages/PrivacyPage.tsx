import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GoldLine } from "@/components/ui/GoldLine";

const sections = [
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
    title: "Contact and Data Requests",
    content: `For privacy questions or to make a data access, correction, or deletion request, contact our data protection contact at privacy@lenda.work, or write to Quantic Engineering Limited (Reg No. 120261048940), Lusaka, Zambia. You also have the right to lodge a complaint with the Office of the Data Protection Commissioner of Zambia.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
        <div className="mb-10">
          <p className="section-label">Legal</p>
          <GoldLine className="w-10 mb-4" />
          <h1 className="font-display font-bold text-4xl text-foreground uppercase tracking-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-foreground/50 text-sm">
            Last updated: June 2026 &nbsp;·&nbsp; Quantic Engineering Limited
            (Reg No. 120261048940)
          </p>
        </div>

        <p className="text-foreground/60 leading-relaxed mb-10">
          Lenda is operated by Quantic Engineering Limited, a company registered
          in Zambia under PACRA. This Privacy Policy explains how we collect,
          use, store, and protect your personal information when you use the
          Lenda platform at lenda.work, in accordance with Zambia&apos;s Data
          Protection Act No. 3 of 2021.
        </p>

        <div className="flex flex-col gap-8">
          {sections.map((section, i) => (
            <div key={section.title}>
              <h2 className="font-display font-bold text-lg text-foreground uppercase tracking-tight mb-2">
                {i + 1}. {section.title}
              </h2>
              <GoldLine className="w-8 mb-3" />
              <p className="text-foreground/60 leading-relaxed text-sm">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
