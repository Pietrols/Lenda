import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GoldLine } from "@/components/ui/GoldLine";

const sections = [
  {
    title: "Acceptance of Terms",
    content: `By creating an account or using the Lenda platform, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you may not use Lenda. These terms apply to all users including guests, hosts, and visitors.`,
  },
  {
    title: "Eligibility",
    content: `You must be at least 18 years old and a resident of Zambia to use Lenda as a host. Guests must be at least 18 years old. By registering, you confirm that the information you provide is accurate and that you have the legal capacity to enter into contracts under Zambian law.`,
  },
  {
    title: "Host Obligations",
    content: `Hosts are responsible for ensuring their listings are accurate, legally compliant, and safe. Hosts must complete KYC verification before creating listings. Hosts must honour confirmed bookings and respond to guest inquiries within a reasonable time. Hosts may not list items they do not own or have permission to rent. Fraudulent listings will result in immediate account suspension.`,
  },
  {
    title: "Guest Obligations",
    content: `Guests must treat rented items and service providers with care and respect. Guests are responsible for returning rented items in the same condition they were received. Guests must confirm handover honestly and may not make false damage or dispute claims. Guests must provide accurate pickup information and attend bookings at the agreed time.`,
  },
  {
    title: "Bookings and Price Lock",
    content: `When a booking is confirmed, the price displayed at the time of booking creation is locked and cannot be changed by either party. Lenda facilitates the connection between hosts and guests but is not a party to the rental or service agreement. All booking disputes must be raised within 24 hours of completion.`,
  },
  {
    title: "Commission and Float",
    content: `Hosts on the FREE plan pay 15% commission on completed bookings. Hosts on PRO plans pay 10% commission. The first 2 completed bookings for each host are commission-free. Commission is deducted automatically from the host's float balance when a booking completes. If a host's float balance is insufficient, new bookings may be restricted until the balance is topped up.`,
  },
  {
    title: "Cancellations and Disputes",
    content: `Either party may cancel a booking before it reaches the ACTIVE status. Once active, cancellations require mutual agreement or admin intervention. Disputed bookings are reviewed by Lenda administrators who will make a final determination based on evidence provided by both parties. Lenda's decision on disputes is final.`,
  },
  {
    title: "Prohibited Conduct",
    content: `You may not use Lenda to list or book anything illegal under Zambian law. You may not harass, threaten, or defraud other users. You may not create multiple accounts to circumvent restrictions. You may not reverse-engineer, scrape, or attempt to gain unauthorised access to the platform. Violations may result in permanent account termination and reporting to relevant authorities.`,
  },
  {
    title: "Limitation of Liability",
    content: `Lenda is a marketplace platform and is not liable for the condition of listed items, the quality of services delivered, or disputes between hosts and guests. We do not guarantee availability of listings or uninterrupted access to the platform. To the maximum extent permitted by Zambian law, Lenda's liability to any user is limited to the commission earned on the relevant transaction.`,
  },
  {
    title: "Account Termination",
    content: `We reserve the right to suspend or terminate any account that violates these terms, engages in fraudulent activity, or poses a risk to other users or the platform. You may close your account at any time by contacting support@lenda.work. Outstanding float balances will be withdrawn to your registered mobile money number within 7 business days of account closure.`,
  },
  {
    title: "Governing Law",
    content: `These terms are governed by the laws of the Republic of Zambia. Any disputes arising from the use of Lenda that cannot be resolved through our internal dispute process shall be subject to the jurisdiction of the courts of Zambia.`,
  },
  {
    title: "Contact",
    content: `For questions about these terms, contact us at legal@lenda.work or write to Pietrols Enterprise Ltd, Lusaka, Zambia.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
        <div className="mb-10">
          <p className="section-label">Legal</p>
          <GoldLine className="w-10 mb-4" />
          <h1 className="font-display font-bold text-4xl text-foreground uppercase tracking-tight mb-3">
            Terms of Service
          </h1>
          <p className="text-foreground/50 text-sm">
            Last updated: April 2026 &nbsp;·&nbsp; Pietrols Enterprise Ltd t/a
            Lenda
          </p>
        </div>

        <p className="text-foreground/60 leading-relaxed mb-10">
          Please read these Terms of Service carefully before using Lenda. These
          terms constitute a legally binding agreement between you and Pietrols
          Enterprise Ltd, trading as Lenda.
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
