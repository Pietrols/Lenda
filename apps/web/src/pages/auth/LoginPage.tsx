import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { authApi } from "@/api/auth";
import { useAuth } from "@/hooks/useAuth";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const { mutate: login, isPending } = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.tokens);
      toast.success(
        `Welcome back${data.user.fullName ? `, ${data.user.fullName}` : ""}!`,
      );
      navigate("/dashboard");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (data: LoginForm) => login(data);

  return (
    <div className="min-h-screen dark-section flex items-center justify-center relative overflow-hidden">
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
            Welcome Back
          </h1>
          <p className="section-body-dark text-sm mt-2">
            Sign in to your account to continue
          </p>
        </div>

        {/* Form card */}
        <div className="glass-card-dark border border-white/10 p-8">
          <form
            onSubmit={handleSubmit(onSubmit)}
            method="post"
            action="#"
            autoComplete="on"
            className="flex flex-col gap-5"
          >
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-white/60">Email Address</label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                autoComplete="username"
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
              <div className="flex items-center justify-between">
                <label className="text-micro text-white/60">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-gold/70 hover:text-gold transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            {/* Submit */}
            <Button
              type="submit"
              variant="gold"
              size="md"
              className="w-full gap-2 mt-2"
              disabled={isPending}
            >
              {isPending ? "Signing in..." : "Sign In"}
              {!isPending && <ArrowRight size={16} />}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-white/50">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="text-gold hover:text-gold/80 font-medium transition-colors"
            >
              Create one
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
