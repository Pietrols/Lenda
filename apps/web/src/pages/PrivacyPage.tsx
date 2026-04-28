import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GoldLine } from "@/components/ui/GoldLine";

const sections = [
  {
    title: "Information We Collect",
    content: `We collect information you provide directly, including your name, email address, phone number, and identity documents for KYC verification. When you use Lenda as a host, we collect listing details, pricing, and availability. For bookings, we collect pickup preferences, notes, and communication records. We also collect usage data such as pages visited, search queries, and device information to improve our platform.`,
  },
  {
    title: "How We Use Your Information",
    content: `Your information is used to operate and improve the Lenda platform — to process bookings, verify identities, facilitate payments through your float account, send notifications, and provide customer support. We use aggregate data to understand how the platform is used and to improve our services. We do not sell your personal data to third parties.`,
  },
  {
    title: "KYC Documents",
    content: `Identity documents submitted for KYC verification are stored securely and accessed only by Lenda administrators for the purpose of identity verification. Documents are stored on encrypted cloud infrastructure. If your KYC application is rejected, your documents are permanently deleted from our systems. Approved documents are retained for legal and compliance purposes for the duration of your account.`,
  },
  {
    title: "Data Sharing",
    content: `We share limited information between hosts and guests to facilitate bookings — this includes names, profile photos, and contact details necessary to complete a transaction. We may share data with service providers who assist us in operating the platform, such as cloud storage, email delivery, and payment processing. All providers are bound by confidentiality agreements. We will disclose information if required by Zambian law or a valid legal order.`,
  },
  {
    title: "Data Retention",
    content: `We retain your account data for as long as your account is active. If you close your account, we will delete your personal data within 30 days, except where retention is required for legal or financial compliance purposes. Transaction records and booking history are retained for 7 years in accordance with Zambian financial regulations.`,
  },
  {
    title: "Your Rights",
    content: `You have the right to access, correct, or request deletion of your personal data. You may update your profile information at any time from your dashboard. To request account deletion or a copy of your data, contact us at privacy@lenda.work. We will respond within 14 business days.`,
  },
  {
    title: "Security",
    content: `We use industry-standard encryption for data in transit and at rest. Passwords are hashed and never stored in plain text. Access tokens are short-lived and rotated on every session. Despite these measures, no system is perfectly secure and we encourage you to use a strong, unique password and keep your account credentials confidential.`,
  },
  {
    title: "Changes to This Policy",
    content: `We may update this policy from time to time. When we make significant changes, we will notify you via email or an in-app notification. Continued use of Lenda after changes take effect constitutes your acceptance of the updated policy.`,
  },
  {
    title: "Contact",
    content: `For privacy-related questions or requests, contact us at privacy@lenda.work or write to Pietrols Enterprise Ltd, Lusaka, Zambia.`,
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
            Last updated: April 2026 &nbsp;·&nbsp; Pietrols Enterprise Ltd t/a
            Lenda
          </p>
        </div>

        <p className="text-foreground/60 leading-relaxed mb-10">
          Lenda is operated by Pietrols Enterprise Ltd, a company registered in
          Zambia. This Privacy Policy explains how we collect, use, and protect
          your personal information when you use the Lenda platform at
          lenda.work.
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
