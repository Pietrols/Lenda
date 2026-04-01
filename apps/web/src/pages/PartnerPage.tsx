import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Handshake,
  TrendingUp,
  Globe,
  Landmark,
  Megaphone,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const partnerSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  partnershipType: z.enum([
    "FUNDING",
    "TECHNOLOGY",
    "MARKETING",
    "DISTRIBUTION",
    "OTHER",
  ]),
  message: z
    .string()
    .min(20, "Please tell us more about the partnership opportunity"),
});

type PartnerForm = z.infer<typeof partnerSchema>;

const partnershipTypes = [
  {
    id: "FUNDING",
    icon: <Landmark size={24} className="text-gold" />,
    title: "Investment & Funding",
    description:
      "Support Lenda's growth through equity investment, grants, or strategic funding partnerships.",
  },
  {
    id: "TECHNOLOGY",
    icon: <Globe size={24} className="text-gold" />,
    title: "Technology",
    description:
      "Integrate your technology with Lenda or build complementary tools on top of our platform.",
  },
  {
    id: "MARKETING",
    icon: <Megaphone size={24} className="text-gold" />,
    title: "Marketing & Media",
    description:
      "Co-marketing campaigns, media coverage, influencer partnerships and brand collaborations.",
  },
  {
    id: "DISTRIBUTION",
    icon: <TrendingUp size={24} className="text-gold" />,
    title: "Distribution",
    description:
      "Help us reach more users across Zambia through your existing network and distribution channels.",
  },
];

const benefits = [
  "Early access to Lenda's growing user base across Zambia",
  "Co-branding opportunities on the platform and marketing materials",
  "Revenue sharing arrangements tailored to your partnership type",
  "Priority API access and dedicated integration support",
  "Quarterly partner reviews and performance reporting",
  "Invitations to Lenda partner events and product launches",
];

export default function PartnerPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.2 },
      );
    });
    return () => ctx.revert();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PartnerForm>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { partnershipType: "FUNDING" },
  });

  const onSubmit = async (data: PartnerForm) => {
    // TODO: wire to backend endpoint
    console.log("Partner application:", data);
    await new Promise((r) => setTimeout(r, 800));
    toast.success(
      "Application received! We will be in touch within 3 business days.",
    );
    reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="dark-section relative overflow-hidden pt-32 pb-20">
        <div className="grain-overlay" />
        <div
          ref={heroRef}
          className="relative z-10 container mx-auto px-4 text-center"
        >
          <p className="section-label">Grow Together</p>
          <GoldLine className="w-12 mx-auto mb-6" />
          <h1 className="text-display text-5xl md:text-6xl text-white leading-none mb-6">
            Partner With
            <br />
            <span className="text-gold">Lenda</span>
          </h1>
          <p className="section-body-dark max-w-2xl mx-auto text-lg">
            We are building Zambia's most trusted rental and services
            marketplace. Join us as a partner and help shape the future of the
            sharing economy in Africa.
          </p>
        </div>
      </section>

      {/* Partnership types */}
      <section className="flowing-section light-section">
        <div className="container mx-auto px-4">
          <div className="section-header">
            <p className="section-label">How We Can Work Together</p>
            <GoldLine className="w-12 mx-auto mb-6" />
            <h2 className="section-heading-light mb-4">
              Partnership Opportunities
            </h2>
            <p className="section-body-light max-w-xl mx-auto">
              We welcome partnerships across a range of areas. Find the model
              that fits your organisation best.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {partnershipTypes.map((type) => (
              <div
                key={type.id}
                className="glass-card p-6 border border-border hover:border-gold/40 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="card-icon-sm mb-4">{type.icon}</div>
                <h3 className="font-display font-bold text-lg text-foreground uppercase tracking-tight mb-2">
                  {type.title}
                </h3>
                <GoldLine className="w-8 mb-3" />
                <p className="section-body-light text-sm">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="flowing-section dark-section relative overflow-hidden">
        <div className="grain-overlay" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
            <div>
              <p className="section-label">What You Get</p>
              <GoldLine className="w-12 mb-6" />
              <h2 className="section-heading-dark mb-6">Partner Benefits</h2>
              <p className="section-body-dark mb-8">
                Our partners are core to Lenda's growth. We invest in these
                relationships and ensure every partner gets tangible value from
                working with us.
              </p>
              <div className="flex flex-col gap-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <CheckCircle
                      size={16}
                      className="text-gold mt-0.5 shrink-0"
                    />
                    <span className="section-body-dark text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card-dark border border-white/10 p-8">
              <div className="card-icon-lg mb-6">
                <Handshake size={28} className="text-gold" />
              </div>
              <h3 className="font-display font-bold text-2xl text-white uppercase tracking-tight mb-3">
                Ready to Partner?
              </h3>
              <GoldLine className="w-10 mb-4" />
              <p className="section-body-dark text-sm mb-6">
                Fill out the application form below. Our partnerships team
                reviews every submission and responds within 3 business days.
              </p>
              <a href="#apply">
                <Button variant="gold" size="md" className="gap-2 w-full">
                  Apply Now <ArrowRight size={16} />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="flowing-section light-section">
        <div className="container mx-auto px-4">
          <div className="section-header">
            <p className="section-label">Get In Touch</p>
            <GoldLine className="w-12 mx-auto mb-6" />
            <h2 className="section-heading-light mb-4">
              Partnership Application
            </h2>
            <p className="section-body-light max-w-xl mx-auto">
              Tell us about your organisation and how you envision working with
              Lenda. We read every application.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-8 border border-border">
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-5"
              >
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-micro text-foreground/60">
                      Company Name
                    </label>
                    <input
                      {...register("companyName")}
                      type="text"
                      placeholder="Acme Corp"
                      className={cn(
                        "w-full h-11 px-4 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60",
                        errors.companyName
                          ? "border-destructive/60"
                          : "border-border",
                      )}
                    />
                    {errors.companyName && (
                      <p className="text-destructive text-xs">
                        {errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-micro text-foreground/60">
                      Contact Name
                    </label>
                    <input
                      {...register("contactName")}
                      type="text"
                      placeholder="Your full name"
                      className={cn(
                        "w-full h-11 px-4 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60",
                        errors.contactName
                          ? "border-destructive/60"
                          : "border-border",
                      )}
                    />
                    {errors.contactName && (
                      <p className="text-destructive text-xs">
                        {errors.contactName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-micro text-foreground/60">
                      Email Address
                    </label>
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="you@company.com"
                      className={cn(
                        "w-full h-11 px-4 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60",
                        errors.email
                          ? "border-destructive/60"
                          : "border-border",
                      )}
                    />
                    {errors.email && (
                      <p className="text-destructive text-xs">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-micro text-foreground/60">
                      Phone (optional)
                    </label>
                    <input
                      {...register("phone")}
                      type="tel"
                      placeholder="+260 97 000 0000"
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-micro text-foreground/60">
                    Partnership Type
                  </label>
                  <select
                    {...register("partnershipType")}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground text-sm outline-none transition-colors focus:border-gold/60"
                  >
                    <option value="FUNDING">Investment & Funding</option>
                    <option value="TECHNOLOGY">Technology</option>
                    <option value="MARKETING">Marketing & Media</option>
                    <option value="DISTRIBUTION">Distribution</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-micro text-foreground/60">
                    Tell Us More
                  </label>
                  <textarea
                    {...register("message")}
                    rows={4}
                    placeholder="Describe your organisation and how you see this partnership working..."
                    className={cn(
                      "w-full px-4 py-3 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60 resize-none",
                      errors.message
                        ? "border-destructive/60"
                        : "border-border",
                    )}
                  />
                  {errors.message && (
                    <p className="text-destructive text-xs">
                      {errors.message.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="gold"
                  size="md"
                  className="gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                  {!isSubmitting && <ArrowRight size={16} />}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
