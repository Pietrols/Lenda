import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/Footer";
import {
  ArrowRight,
  Star,
  Car,
  Briefcase,
  CalendarCheck,
  Search,
  ShieldCheck,
  CheckCircle,
  TrendingUp,
  Shield,
  Coins,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.5 });
      tl.fromTo(
        bgRef.current,
        { scale: 1.1 },
        { scale: 1, duration: 1.8, ease: "power2.out" },
      )
        .fromTo(
          headingRef.current,
          { y: "18vh", opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "power3.out" },
          "-=1.2",
        )
        .fromTo(
          subRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
          "-=0.6",
        )
        .fromTo(
          ctaRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "power2.out" },
          "-=0.5",
        )
        .fromTo(
          statsRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "power2.out" },
          "-=0.4",
        );
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-grow ">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section
          ref={heroRef}
          className="pinned-section relative flex items-center min-h-[80vh]"
        >
          <div
            ref={bgRef}
            className="absolute inset-0 will-change-transform"
            style={{
              backgroundImage: "url('/images/hero-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="grain-overlay" />

          <div className="relative z-10 container mx-auto px-4 py-24 md:pt-28 md:py-20">
            <div className="max-w-3xl">
              <p className="section-label">
                Zambia's Rental & Services Marketplace
              </p>
              <GoldLine className="w-16 mb-6" />
              <h1
                ref={headingRef}
                className="text-display text-5xl md:text-7xl text-white leading-none mb-6"
              >
                Rent Anything.
                <br />
                Hire Anyone.
                <br />
                <span className="text-gold">Lenda hand and earn.</span>
              </h1>
              <p ref={subRef} className="section-body-dark max-w-xl mb-10">
                From cars to property, services to equipment - find trusted
                hosts and verified listings all in one place.
              </p>
              <div ref={ctaRef} className="flex flex-wrap gap-4 mb-16">
                <Link to="/listings">
                  <Button variant="gold" size="lg" className="gap-2">
                    Browse Listings <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="outlineGold" size="lg">
                    Become a Host
                  </Button>
                </Link>
              </div>
              <div ref={statsRef} className="flex flex-wrap gap-8">
                {[
                  { value: "500+", label: "Active Listings" },
                  { value: "1,200+", label: "Happy Guests" },
                  {
                    value: "4.8",
                    label: "Average Rating",
                    icon: <Star size={14} className="text-gold fill-gold" />,
                  },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="flex items-center gap-1">
                      <span className="font-display font-black text-3xl text-white">
                        {stat.value}
                      </span>
                      {stat.icon}
                    </div>
                    <p className="section-label mt-1 opacity-50">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </section>

        {/* ── Pillars ───────────────────────────────────────── */}
        <section className="flowing-section bg-background">
          <div className="container mx-auto px-4">
            <div className="section-header">
              <p className="section-label">What We Offer</p>
              <GoldLine className="w-12 mx-auto mb-6" />
              <h2 className="section-heading-light mb-4">
                Two Pillars,
                <br />
                <span className="text-gold">Endless Possibilities</span>
              </h2>
              <p className="text-foreground/60 text-lg leading-relaxed max-w-xl mx-auto">
                Whether you need something rented or a service delivered, Lenda
                connects you with trusted hosts across Zambia.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {[
                {
                  href: "/listings?pillar=RENTAL",
                  icon: <Car size={28} className="text-gold" />,
                  label: "Pillar One",
                  title: "Rentals",
                  body: "Rent vehicles, property, equipment and more from verified hosts. Price locked at booking - no surprises.",
                  tags: ["Cars", "Property", "Equipment", "Bikes"],
                  cta: "Browse Rentals",
                },
                {
                  href: "/listings?pillar=SERVICE",
                  icon: <Briefcase size={28} className="text-gold" />,
                  label: "Pillar Two",
                  title: "Services",
                  body: "Hire skilled professionals for any job. From cleaning to repairs, find the right person fast.",
                  tags: ["Cleaning", "Repairs", "Delivery", "Tutoring"],
                  cta: "Browse Services",
                },
              ].map((pillar) => (
                <Link key={pillar.href} to={pillar.href} className="group">
                  <div className="glass-card p-8 h-full border border-border hover:border-gold/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                    <div className="card-icon-lg mb-6 group-hover:bg-gold/20 transition-colors duration-300">
                      {pillar.icon}
                    </div>
                    <p className="section-label">{pillar.label}</p>
                    <h3 className="font-display font-bold text-2xl text-foreground mb-3 uppercase tracking-tight">
                      {pillar.title}
                    </h3>
                    <GoldLine className="w-10 mb-4" />
                    <p className="text-foreground/60 text-lg leading-relaxed mb-6">
                      {pillar.body}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {pillar.tags.map((tag) => (
                        <span key={tag} className="lenda-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="lenda-link group-hover:gap-3">
                      {pillar.cta} <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────── */}
        <section
          id="how-it-works"
          className="flowing-section dark-section relative overflow-hidden"
        >
          <div className="grain-overlay" />
          <div className="relative z-10 container mx-auto px-4">
            <div className="section-header">
              <p className="section-label">Simple Process</p>
              <GoldLine className="w-12 mx-auto mb-6" />
              <h2 className="section-heading-dark mb-4">How Lenda Works</h2>
              <p className="section-body-dark max-w-xl mx-auto">
                From browsing to booking in minutes. Lenda makes it effortless.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: "01",
                  title: "Browse & Discover",
                  body: "Search listings by category, location or pillar. Filter by price, rating and availability. Every listing is from a verified host.",
                  icon: <Search size={28} className="text-gold" />,
                },
                {
                  step: "02",
                  title: "Book & Lock Price",
                  body: "Select your dates, choose pickup type, and confirm. Your price is locked at the moment of booking - it never changes.",
                  icon: <CalendarCheck size={28} className="text-gold" />,
                },
                {
                  step: "03",
                  title: "Meet & Confirm",
                  body: "Both parties confirm handover via the app. Once confirmed, your rental or service is officially active and protected.",
                  icon: <ShieldCheck size={28} className="text-gold" />,
                },
              ].map((item, index) => (
                <div key={item.step} className="relative group">
                  {index < 2 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-full h-[1px] bg-gold/20 z-0" />
                  )}
                  <div className="relative z-10 flex flex-col items-start">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="card-icon-lg border border-gold/20 group-hover:bg-gold/20 transition-colors duration-300">
                        {item.icon}
                      </div>
                      <span className="font-display font-black text-5xl text-gold/20 leading-none">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-xl text-white uppercase tracking-tight mb-3">
                      {item.title}
                    </h3>
                    <GoldLine className="w-8 mb-4" />
                    <p className="section-body-dark">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-16">
              <Link to="/register">
                <Button variant="gold" size="lg" className="gap-2">
                  Start Now <ArrowRight size={18} />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Host Section ──────────────────────────────────── */}
        <section id="host" className="flowing-section bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
              <div>
                <p className="section-label">For Hosts</p>
                <GoldLine className="w-12 mb-6" />
                <h2 className="section-heading-light mb-6">
                  Turn What You Have
                  <br />
                  <span className="text-gold">Into Income</span>
                </h2>
                <p className="text-foreground/60 text-lg leading-relaxed mb-8">
                  List your car, property, equipment or skills and start
                  earning. Lenda handles the bookings, payments and
                  accountability - you focus on delivering great experiences.
                </p>
                <div className="flex flex-col gap-4 mb-10">
                  {[
                    "Free to list - only pay when you earn",
                    "Price lock protects you from disputes",
                    "Dual-confirm handover for accountability",
                    "Build your reputation with reviews",
                    "Upgrade to Pro for more visibility and slots",
                  ].map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <CheckCircle
                        size={18}
                        className="text-gold mt-0.5 shrink-0"
                      />
                      <span className="text-foreground/70 text-sm">
                        {point}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4">
                  <Link to="/register">
                    <Button variant="gold" size="lg" className="gap-2">
                      Become a Host <ArrowRight size={18} />
                    </Button>
                  </Link>
                  <Link to="/#how-it-works">
                    <Button variant="outlineGold" size="lg">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: <Coins size={24} className="text-gold" />,
                    title: "Earn More",
                    body: "Set your own prices. Pro hosts earn up to 40% more with boosted visibility.",
                  },
                  {
                    icon: <Shield size={24} className="text-gold" />,
                    title: "Stay Protected",
                    body: "Dual-confirm handover means both parties are accountable for every booking.",
                  },
                  {
                    icon: <TrendingUp size={24} className="text-gold" />,
                    title: "Grow Your Rep",
                    body: "Reviews and likes build your profile score. Better score means more bookings.",
                  },
                  {
                    icon: <Star size={24} className="text-gold" />,
                    title: "Get Verified",
                    body: "KYC verification unlocks listing slots and boosts your discovery score.",
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="glass-card p-6 border border-border hover:border-gold/40 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="card-icon-sm mb-4">{feature.icon}</div>
                    <h4 className="font-display font-bold text-sm uppercase tracking-tight text-foreground mb-2">
                      {feature.title}
                    </h4>
                    <p className="text-foreground/50 text-xs leading-relaxed">
                      {feature.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
