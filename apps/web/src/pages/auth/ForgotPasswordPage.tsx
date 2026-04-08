import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Mail } from "lucide-react";
import { authApi } from "@/api/auth";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const { mutate: sendReset, isPending } = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
    onSuccess: () => setSent(true),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen dark-section flex items-center justify-center relative overflow-hidden py-12">
      <div className="grain-overlay" />
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <Link to="/">
            <span className="font-display font-black text-4xl tracking-tight text-white">
              LEN<span className="text-gold">DA</span>
            </span>
          </Link>
          <GoldLine className="w-12 mx-auto mt-4 mb-6" />
          <h1 className="font-display font-bold text-2xl text-white uppercase tracking-tight">
            Reset Password
          </h1>
          <p className="text-white/50 text-sm mt-2">
            Enter your email and we'll send you a reset code.
          </p>
        </div>

        <div className="glass-card-dark border border-white/10 p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center">
                <Mail size={24} className="text-gold" />
              </div>
              <h2 className="font-display font-bold text-lg text-white uppercase">
                Check your email
              </h2>
              <p className="text-white/50 text-sm">
                If an account exists for {email}, a reset code has been sent.
              </p>
              <Link to={`/reset-password?email=${encodeURIComponent(email)}`}>
                <Button variant="gold" size="md" className="gap-2 mt-2">
                  Enter Reset Code <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-micro text-white/60">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-gold/60 transition-colors"
                />
              </div>
              <Button
                variant="gold"
                size="md"
                className="w-full gap-2"
                disabled={isPending || !email}
                onClick={() => sendReset()}
              >
                {isPending ? "Sending..." : "Send Reset Code"}
                {!isPending && <ArrowRight size={16} />}
              </Button>
            </div>
          )}

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <p className="text-center text-sm text-white/50">
            Remember your password?{" "}
            <Link
              to="/login"
              className="text-gold hover:text-gold/80 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
