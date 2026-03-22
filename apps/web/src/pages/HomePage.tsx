import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Star, Car, Briefcase } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative w-screen h-screen overflow-hidden flex items-center"
      >
        {/* Background image */}
        <div
          ref={bgRef}
          className="absolute inset-0 will-change-transform"
          style={{
            backgroundImage: "url('/images/hero-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Grain overlay */}
        <div className="grain-overlay" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-3xl">
            {/* Micro label */}
            <p className="text-micro text-gold mb-4">
              Zambia's Rental & Services Marketplace
            </p>

            <GoldLine className="w-16 mb-6" />

            {/* Heading */}
            <h1
              ref={headingRef}
              className="text-display text-5xl md:text-7xl text-white leading-none mb-6"
            >
              Rent Anything.
              <br />
              Hire Anyone.
              <br />
              <span className="text-gold">Lenda It.</span>
            </h1>

            {/* Subheading */}
            <p
              ref={subRef}
              className="text-lg md:text-xl text-white/70 max-w-xl mb-10 leading-relaxed"
            >
              From cars to property, services to equipment - find trusted hosts
              and verified listings all in one place.
            </p>

            {/* CTAs */}
            <div ref={ctaRef} className="flex flex-wrap gap-4 mb-16">
              <Link to="/listings">
                <Button variant="gold" size="lg" className="gap-2">
                  Browse Listings
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outlineGold" size="lg">
                  Become a Host
                </Button>
              </Link>
            </div>

            {/* Stats */}
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
                  <p className="text-micro text-white/50 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>
      {/* Pillars Section */}
      <section className="flowing-section light-section">
        <div className="container mx-auto px-4">
          {/* Section header */}
          <div className="text-center mb-16">
            <p className="text-micro text-gold mb-3">What We Offer</p>
            <GoldLine className="w-12 mx-auto mb-6" />
            <h2 className="text-section-title text-4xl md:text-5xl text-foreground mb-4">
              Two Pillars,
              <br />
              <span className="text-gold">Endless Possibilities</span>
            </h2>
            <p className="text-foreground/60 max-w-xl mx-auto text-lg">
              Whether you need something rented or a service delivered, Lenda
              connects you with trusted hosts across Zambia.
            </p>
          </div>

          {/* Pillar cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Rental */}
            <Link to="/listings?pillar=RENTAL" className="group">
              <div className="glass-card p-8 h-full border border-border hover:border-gold/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mb-6 group-hover:bg-gold/20 transition-colors duration-300">
                  <Car size={28} className="text-gold" />
                </div>
                <p className="text-micro text-gold mb-2">Pillar One</p>
                <h3 className="font-display font-bold text-2xl text-foreground mb-3 uppercase tracking-tight">
                  Rentals
                </h3>
                <GoldLine className="w-10 mb-4" />
                <p className="text-foreground/60 leading-relaxed mb-6">
                  Rent vehicles, property, equipment and more from verified
                  hosts. Price locked at booking — no surprises.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["Cars", "Property", "Equipment", "Bikes"].map((cat) => (
                    <span
                      key={cat}
                      className="text-xs font-medium px-3 py-1 rounded-full bg-gold/10 text-gold"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-gold font-semibold text-sm group-hover:gap-3 transition-all duration-200">
                  Browse Rentals <ArrowRight size={16} />
                </div>
              </div>
            </Link>

            {/* Services */}
            <Link to="/listings?pillar=SERVICE" className="group">
              <div className="glass-card p-8 h-full border border-border hover:border-gold/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mb-6 group-hover:bg-gold/20 transition-colors duration-300">
                  <Briefcase size={28} className="text-gold" />
                </div>
                <p className="text-micro text-gold mb-2">Pillar Two</p>
                <h3 className="font-display font-bold text-2xl text-foreground mb-3 uppercase tracking-tight">
                  Services
                </h3>
                <GoldLine className="w-10 mb-4" />
                <p className="text-foreground/60 leading-relaxed mb-6">
                  Hire skilled professionals for any job. From cleaning to
                  repairs, find the right person fast.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["Cleaning", "Repairs", "Delivery", "Tutoring"].map(
                    (cat) => (
                      <span
                        key={cat}
                        className="text-xs font-medium px-3 py-1 rounded-full bg-gold/10 text-gold"
                      >
                        {cat}
                      </span>
                    ),
                  )}
                </div>
                <div className="flex items-center gap-2 text-gold font-semibold text-sm group-hover:gap-3 transition-all duration-200">
                  Browse Services <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
