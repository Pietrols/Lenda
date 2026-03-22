import { Link } from "react-router-dom";
import { GoldLine } from "@/components/ui/GoldLine";
import { Twitter, Instagram, Facebook, Mail } from "lucide-react";

const footerLinks = {
  Explore: [
    { label: "Browse Rentals", href: "/listings?pillar=RENTAL" },
    { label: "Browse Services", href: "/listings?pillar=SERVICE" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Become a Host", href: "/register" },
  ],
  Company: [
    { label: "About Lenda", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Refund Policy", href: "/refunds" },
  ],
};

type SocialLink = {
  icon: React.ReactNode;
  href: string;
  label: string;
};

const socialLinks: SocialLink[] = [
  {
    icon: <Twitter size={18} />,
    href: "https://twitter.com",
    label: "Twitter",
  },
  {
    icon: <Instagram size={18} />,
    href: "https://instagram.com",
    label: "Instagram",
  },
  {
    icon: <Facebook size={18} />,
    href: "https://facebook.com",
    label: "Facebook",
  },
  { icon: <Mail size={18} />, href: "mailto:hello@lenda.app", label: "Email" },
];

export function Footer() {
  return (
    <footer className="dark-section relative overflow-hidden">
      <div className="grain-overlay" />

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="inline-block mb-4">
              <span className="font-display font-black text-3xl tracking-tight text-white">
                LEN<span className="text-gold">DA</span>
              </span>
            </Link>
            <GoldLine className="w-12 mb-6" />
            <p className="section-body-dark text-sm max-w-xs">
              Zambia&apos;s trusted marketplace for rentals and services.
              Connect with verified hosts and get things done.
            </p>
            <div className="flex gap-3 mt-6">
              {socialLinks.map((social) => {
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-gold hover:border-gold/40 transition-all duration-200"
                  >
                    {social.icon}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <p className="section-label mb-4">{group}</p>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-white/50 hover:text-gold transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <GoldLine className="w-full mb-8 opacity-20" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-sm">
            &copy; {new Date().getFullYear()} Lenda. All rights reserved.
          </p>
          <p className="text-white/20 text-xs">Built in Zambia 🇿🇲</p>
        </div>
      </div>
    </footer>
  );
}
