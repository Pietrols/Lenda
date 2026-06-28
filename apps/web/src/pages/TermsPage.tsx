import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GoldLine } from "@/components/ui/GoldLine";

const sections = [
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
            Last updated: June 2026 &nbsp;·&nbsp; Quantic Engineering Limited
            (Reg No. 120261048940)
          </p>
        </div>

        <p className="text-foreground/60 leading-relaxed mb-10">
          Please read these Terms of Service carefully before using Lenda. These
          terms constitute a legally binding agreement between you and Quantic
          Engineering Limited (Registration Number 120261048940), the company
          that operates Lenda, with its registered office in Lusaka, Zambia.
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
