"use client";

import { useState } from "react";
import { authApi } from "@/lib/api/endpoints/auth.endpoints";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await authApi.forgotPassword({ email });
      showToast(response.message, "success");
      // Indirectly tell them where to go next
      // We'll store the email in session storage to use on the reset page
      sessionStorage.setItem("reset_email", email);
      router.push("/reset-password");
    } catch (error: any) {
      showToast(error.message || "Failed to send reset link", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" id="forgot-password-page">
      {/* ─── Left Panel: Branded Hero (Reused from Login) ─────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] bg-primary-gradient relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
          <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link href="/login" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm flex items-center justify-center rounded-xl border border-white/10">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance
              </span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg tracking-tight leading-tight">Academic Architect</h2>
            </div>
          </Link>
        </div>

        <div className="relative z-10 -mt-8">
          <h1 className="text-white text-5xl xl:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight">
            Recover your<br />
            access to<br />
            <span className="text-surface-dim">excellence.</span>
          </h1>
          <p className="text-white/50 text-sm font-medium mt-8 max-w-[320px] leading-relaxed">
            Forgot your credentials? Don't worry. We'll help you get back to designing the future of academic excellence.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 pt-4 border-t border-white/10">
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
              Secure Asset Recovery Protocol enabled
            </p>
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Content ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-surface-lowest">
        <div className="w-full max-w-[420px] space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
              Forgot password?
            </h1>
            <p className="text-on-surface-variant/60 text-sm font-medium mt-2">
              Enter your institutional email to receive a 6-digit verification code.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Institutional Email"
              id="forgot-email"
              type="email"
              placeholder="name@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<span className="text-sm font-bold">@</span>}
              autoComplete="email"
              autoFocus
              disabled={isLoading}
            />

            <Button
              type="submit"
              disabled={isLoading || !email}
              className="w-full h-13 py-4 gradient-primary text-white font-bold rounded-xl shadow-premium text-base tracking-tight hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  Send OTP
                  <span className="material-symbols-outlined text-lg">mail</span>
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <Link 
              href="/login" 
              className="text-sm font-bold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Back to Sign In
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 border-t border-outline-variant/10">
            <span className="material-symbols-outlined text-emerald-500 text-sm" style={{ fontSize: '14px' }}>
              verified_user
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
              Secured by Academic Architect
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
