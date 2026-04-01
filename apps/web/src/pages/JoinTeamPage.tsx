import { useRef, useEffect, useState } from "react";
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
  Megaphone,
  Code2,
  BarChart3,
  HeartHandshake,
  ShieldCheck,
  Palette,
  ArrowRight,
  MapPin,
  Clock,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const roles = [
  {
    id: "MARKETING",
    icon: <Megaphone size={22} className="text-gold" />,
    title: "Marketing & Growth",
    type: "Full-time",
    location: "Lusaka, Zambia",
    description:
      "Drive user acquisition, brand awareness and community growth across Zambia. You will own social media, campaigns and partnerships.",
  },
  {
    id: "ENGINEERING",
    icon: <Code2 size={22} className="text-gold" />,
    title: "Software Engineer",
    type: "Full-time",
    location: "Remote / Lusaka",
    description:
      "Build and scale the Lenda platform. We work in TypeScript, React, Node.js and PostgreSQL. You care deeply about code quality.",
  },
  {
    id: "DESIGN",
    icon: <Palette size={22} className="text-gold" />,
    title: "Product Designer",
    type: "Contract / Full-time",
    location: "Remote",
    description:
      "Shape how Lenda looks and feels. From user flows to polished interfaces, you will own the design system and product experience.",
  },
  {
    id: "OPERATIONS",
    icon: <BarChart3 size={22} className="text-gold" />,
    title: "Operations & Logistics",
    type: "Full-time",
    location: "Lusaka, Zambia",
    description:
      "Keep things running smoothly. You will manage host onboarding, dispute resolution, quality control and day-to-day operations.",
  },
  {
    id: "PARTNERSHIPS",
    icon: <HeartHandshake size={22} className="text-gold" />,
    title: "Partnerships & Sales",
    type: "Full-time",
    location: "Lusaka, Zambia",
    description:
      "Build and close relationships with hosts, businesses and institutions. You are the face of Lenda in the field.",
  },
  {
    id: "TRUST",
    icon: <ShieldCheck size={22} className="text-gold" />,
    title: "Trust & Safety",
    type: "Full-time",
    location: "Lusaka, Zambia",
    description:
      "Protect users and the platform. You will review listings, handle disputes, run KYC verification and keep standards high.",
  },
];

const values = [
  {
    title: "Build for Zambia",
    body: "We are solving real problems for real people in our own backyard. Every decision is grounded in local context.",
  },
  {
    title: "Move Fast",
    body: "We ship, learn and iterate. We value done over perfect and progress over process.",
  },
  {
    title: "Own It",
    body: "Every team member owns their area completely. No micromanagement, full accountability.",
  },
  {
    title: "Be Honest",
    body: "We give direct feedback, share bad news early and communicate openly across the team.",
  },
];

const applySchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.string().min(1, "Please select a role"),
  linkedin: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  portfolio: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  message: z.string().min(30, "Please tell us a bit more about yourself"),
});

type ApplyForm = z.infer<typeof applySchema>;

export default function JoinTeamPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ApplyForm>({
    resolver: zodResolver(applySchema),
  });

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    setValue("role", roleId);
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  };

  const onSubmit = async (data: ApplyForm) => {
    // TODO: wire to backend endpoint
    console.log("Team application:", data);
    await new Promise((r) => setTimeout(r, 800));
    toast.success(
      "Application submitted! We will review it and get back to you soon.",
    );
    reset();
    setSelectedRole(null);
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
          <p className="section-label">We Are Hiring</p>
          <GoldLine className="w-12 mx-auto mb-6" />
          <h1 className="text-display text-5xl md:text-6xl text-white leading-none mb-6">
            Join the
            <br />
            <span className="text-gold">Lenda Team</span>
          </h1>
          <p className="section-body-dark max-w-2xl mx-auto text-lg">
            We are a small, ambitious team building something that matters for
            Zambia. If you want to do the best work of your life on a problem
            worth solving, we want to hear from you.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="flowing-section light-section">
        <div className="container mx-auto px-4">
          <div className="section-header">
            <p className="section-label">How We Work</p>
            <GoldLine className="w-12 mx-auto mb-6" />
            <h2 className="section-heading-light mb-4">Our Values</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value) => (
              <div
                key={value.title}
                className="glass-card p-6 border border-border hover:border-gold/40 transition-all duration-300"
              >
                <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight mb-2">
                  {value.title}
                </h3>
                <GoldLine className="w-8 mb-3" />
                <p className="section-body-light text-xs leading-relaxed">
                  {value.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section className="flowing-section dark-section relative overflow-hidden">
        <div className="grain-overlay" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="section-header">
            <p className="section-label">Open Positions</p>
            <GoldLine className="w-12 mx-auto mb-6" />
            <h2 className="section-heading-dark mb-4">Current Openings</h2>
            <p className="section-body-dark max-w-xl mx-auto">
              Click a role to apply. Do not see something that fits? Apply
              anyway with a general application — we hire for talent, not just
              titles.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {roles.map((role) => (
              <div
                key={role.id}
                className={cn(
                  "glass-card-dark border p-6 transition-all duration-300 cursor-pointer hover:-translate-y-1",
                  selectedRole === role.id
                    ? "border-gold/60 bg-gold/5"
                    : "border-white/10 hover:border-gold/30",
                )}
                onClick={() => handleRoleSelect(role.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="card-icon-sm shrink-0">{role.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-base text-white uppercase tracking-tight mb-1">
                      {role.title}
                    </h3>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <Clock size={10} /> {role.type}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <MapPin size={10} /> {role.location}
                      </span>
                    </div>
                    <p className="section-body-dark text-xs leading-relaxed">
                      {role.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <span className="lenda-link text-xs">
                    Apply for this role <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="flowing-section light-section">
        <div className="container mx-auto px-4">
          <div className="section-header">
            <p className="section-label">Apply</p>
            <GoldLine className="w-12 mx-auto mb-6" />
            <h2 className="section-heading-light mb-4">
              {selectedRole
                ? `Applying for ${roles.find((r) => r.id === selectedRole)?.title}`
                : "Send Us Your Application"}
            </h2>
            <p className="section-body-light max-w-xl mx-auto">
              We review every application personally. No automated rejections.
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
                      Full Name
                    </label>
                    <input
                      {...register("fullName")}
                      type="text"
                      placeholder="Your full name"
                      className={cn(
                        "w-full h-11 px-4 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60",
                        errors.fullName
                          ? "border-destructive/60"
                          : "border-border",
                      )}
                    />
                    {errors.fullName && (
                      <p className="text-destructive text-xs">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-micro text-foreground/60">
                      Email Address
                    </label>
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="you@example.com"
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
                </div>

                <div className="grid md:grid-cols-2 gap-5">
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

                  <div className="flex flex-col gap-1.5">
                    <label className="text-micro text-foreground/60">
                      Role
                    </label>
                    <select
                      {...register("role")}
                      className={cn(
                        "w-full h-11 px-4 rounded-xl bg-background border text-foreground text-sm outline-none transition-colors focus:border-gold/60",
                        errors.role ? "border-destructive/60" : "border-border",
                      )}
                    >
                      <option value="">Select a role</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                      <option value="GENERAL">General Application</option>
                    </select>
                    {errors.role && (
                      <p className="text-destructive text-xs">
                        {errors.role.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-micro text-foreground/60">
                      LinkedIn (optional)
                    </label>
                    <input
                      {...register("linkedin")}
                      type="url"
                      placeholder="https://linkedin.com/in/..."
                      className={cn(
                        "w-full h-11 px-4 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60",
                        errors.linkedin
                          ? "border-destructive/60"
                          : "border-border",
                      )}
                    />
                    {errors.linkedin && (
                      <p className="text-destructive text-xs">
                        {errors.linkedin.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-micro text-foreground/60">
                      Portfolio / CV Link (optional)
                    </label>
                    <input
                      {...register("portfolio")}
                      type="url"
                      placeholder="https://yourportfolio.com"
                      className={cn(
                        "w-full h-11 px-4 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60",
                        errors.portfolio
                          ? "border-destructive/60"
                          : "border-border",
                      )}
                    />
                    {errors.portfolio && (
                      <p className="text-destructive text-xs">
                        {errors.portfolio.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-micro text-foreground/60">
                    Tell Us About Yourself
                  </label>
                  <textarea
                    {...register("message")}
                    rows={5}
                    placeholder="What have you built or done that you are most proud of? Why Lenda?"
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
