import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, Home, Briefcase } from "lucide-react";
import { authApi } from "@/api/auth";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    role: z.enum(["GUEST", "HOST"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "GUEST" },
  });

  const selectedRole = useWatch({ control, name: "role" });

  const { mutate: registerUser, isPending } = useMutation({
    mutationFn: (data: RegisterForm) =>
      authApi.register({
        email: data.email,
        password: data.password,
        roles: [data.role],
      }),
    onSuccess: (_, variables) => {
      toast.success(
        "Account created! Check your email for a verification code.",
      );
      navigate(`/verify-email?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (data: RegisterForm) => registerUser(data);

  return (
    <div className="min-h-screen dark-section flex items-center justify-center relative overflow-hidden py-12">
      <div className="grain-overlay" />

      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <span className="font-display font-black text-4xl tracking-tight text-white">
              LEN<span className="text-gold">DA</span>
            </span>
          </Link>
          <GoldLine className="w-12 mx-auto mt-4 mb-6" />
          <h1 className="font-display font-bold text-2xl text-white uppercase tracking-tight">
            Create Account
          </h1>
          <p className="section-body-dark text-sm mt-2">
            Join Zambia&apos;s trusted marketplace
          </p>
        </div>

        {/* Form card */}
        <div className="glass-card-dark border border-white/10 p-8">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            {/* Role selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-white/60">I want to</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    value: "GUEST",
                    label: "Rent & Hire",
                    description: "Browse and book listings",
                    icon: <Home size={20} className="text-gold" />,
                  },
                  {
                    value: "HOST",
                    label: "List & Earn",
                    description: "Host listings and services",
                    icon: <Briefcase size={20} className="text-gold" />,
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setValue("role", option.value as "GUEST" | "HOST")
                    }
                    className={cn(
                      "flex flex-col items-start gap-1 p-4 rounded-xl border transition-all duration-200 text-left",
                      selectedRole === option.value
                        ? "border-gold/60 bg-gold/10"
                        : "border-white/10 bg-white/5 hover:border-white/20",
                    )}
                  >
                    {option.icon}
                    <span className="font-display font-bold text-sm text-white uppercase tracking-tight mt-2">
                      {option.label}
                    </span>
                    <span className="text-white/40 text-xs">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
              {errors.role && (
                <p className="text-red-400 text-xs">{errors.role.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-white/60">Email Address</label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className={cn(
                  "w-full h-11 px-4 rounded-xl bg-white/5 border text-white placeholder:text-white/30 text-sm outline-none transition-colors duration-200 focus:border-gold/60",
                  errors.email ? "border-red-500/60" : "border-white/10",
                )}
              />
              {errors.email && (
                <p className="text-red-400 text-xs">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-white/60">Password</label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                  className={cn(
                    "w-full h-11 px-4 pr-11 rounded-xl bg-white/5 border text-white placeholder:text-white/30 text-sm outline-none transition-colors duration-200 focus:border-gold/60",
                    errors.password ? "border-red-500/60" : "border-white/10",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-white/60">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  {...register("confirmPassword")}
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={cn(
                    "w-full h-11 px-4 pr-11 rounded-xl bg-white/5 border text-white placeholder:text-white/30 text-sm outline-none transition-colors duration-200 focus:border-gold/60",
                    errors.confirmPassword
                      ? "border-red-500/60"
                      : "border-white/10",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="gold"
              size="md"
              className="w-full gap-2 mt-2"
              disabled={isPending}
            >
              {isPending ? "Creating account..." : "Create Account"}
              {!isPending && <ArrowRight size={16} />}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-white/50">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-gold hover:text-gold/80 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <p className="text-center mt-6">
          <Link
            to="/"
            className="text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            ← Back to Lenda
          </Link>
        </p>
      </div>
    </div>
  );
}
