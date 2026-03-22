import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, RotateCcw } from "lucide-react";
import { authApi } from "@/api/auth";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const verifySchema = z.object({
  otp: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d+$/, "Code must be numbers only"),
});

type VerifyForm = z.infer<typeof verifySchema>;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
  });

  // Handle OTP input — auto advance to next box
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    const otpString = newOtp.join("");
    setValue("otp", otpString);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace — go back to previous box
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste — fill all boxes at once
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      setValue("otp", pasted);
      inputRefs.current[5]?.focus();
    }
  };

  const { mutate: verify, isPending } = useMutation({
    mutationFn: (data: VerifyForm) =>
      authApi.verifyEmail({ email, otp: data.otp }),
    onSuccess: () => {
      toast.success("Email verified! You can now sign in.");
      navigate("/login");
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setOtp(["", "", "", "", "", ""]);
      setValue("otp", "");
      inputRefs.current[0]?.focus();
    },
  });

  const { mutate: resend, isPending: isResending } = useMutation({
    mutationFn: () => authApi.register({ email, password: "", roles: [] }),
    onSuccess: () => {
      toast.success("A new code has been sent to your email.");
    },
    onError: () => {
      toast.error("Failed to resend code. Please try again.");
    },
  });

  const onSubmit = (data: VerifyForm) => verify(data);

  return (
    <div className="min-h-screen dark-section flex items-center justify-center relative overflow-hidden">
      <div className="grain-overlay" />

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
            Verify Your Email
          </h1>
          <p className="section-body-dark text-sm mt-2 max-w-xs mx-auto">
            We sent a 6-digit code to{" "}
            <span className="text-gold font-medium">
              {email || "your email"}
            </span>
            . Enter it below.
          </p>
        </div>

        {/* Form card */}
        <div className="glass-card-dark border border-white/10 p-8">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            {/* OTP boxes */}
            <div className="flex flex-col gap-2">
              <label className="text-micro text-white/60 text-center">
                Verification Code
              </label>
              <div className="flex gap-3 justify-center" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={cn(
                      "w-12 h-14 text-center text-xl font-bold text-white rounded-xl border bg-white/5 outline-none transition-all duration-200 focus:border-gold/60 focus:bg-gold/5",
                      errors.otp ? "border-red-500/60" : "border-white/10",
                    )}
                  />
                ))}
              </div>
              {errors.otp && (
                <p className="text-red-400 text-xs text-center">
                  {errors.otp.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="gold"
              size="md"
              className="w-full gap-2"
              disabled={isPending || otp.join("").length < 6}
            >
              {isPending ? "Verifying..." : "Verify Email"}
              {!isPending && <ArrowRight size={16} />}
            </Button>
          </form>

          {/* Resend */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <p className="text-sm text-white/40">Didn&apos;t receive a code?</p>
            <button
              type="button"
              onClick={() => resend()}
              disabled={isResending}
              className="flex items-center gap-1 text-sm text-gold hover:text-gold/80 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={13} />
              {isResending ? "Sending..." : "Resend"}
            </button>
          </div>
        </div>

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
