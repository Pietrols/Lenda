import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { authApi } from "@/api/auth";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromParams = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: resetPassword, isPending } = useMutation({
    mutationFn: () => authApi.resetPassword(emailFromParams, otp, newPassword),
    onSuccess: () => {
      toast.success("Password reset successfully. Please sign in.");
      navigate("/login");
    },
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
            New Password
          </h1>
          <p className="text-white/50 text-sm mt-2">
            Enter the code sent to {emailFromParams}
          </p>
        </div>

        <div className="glass-card-dark border border-white/10 p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-micro text-white/60">Reset Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-gold/60 transition-colors tracking-widest text-center"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-micro text-white/60">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                className="w-full h-11 px-4 pr-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-gold/60 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            variant="gold"
            size="md"
            className="w-full gap-2"
            disabled={isPending || !otp || !newPassword}
            onClick={() => resetPassword()}
          >
            {isPending ? "Resetting..." : "Reset Password"}
            {!isPending && <ArrowRight size={16} />}
          </Button>

          <p className="text-center text-sm text-white/50">
            <Link
              to="/forgot-password"
              className="text-gold hover:text-gold/80 font-medium transition-colors"
            >
              Resend code
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
