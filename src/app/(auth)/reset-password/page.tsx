"use client";

import { useState, useEffect } from "react";
import { authApi } from "@/lib/api/endpoints/auth.endpoints";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("reset_email");
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
    }
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    if (formData.otp.length !== 6) {
      showToast("Please enter a valid 6-digit OTP", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.resetPassword({
        email: formData.email,
        otp: formData.otp,
        newPassword: formData.newPassword
      });
      showToast(response.message, "success");
      sessionStorage.removeItem("reset_email");
      router.push("/login");
    } catch (error: any) {
      showToast(error.message || "Failed to reset password", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" id="reset-password-page">
      {/* ─── Left Panel (Branded Hero) ─────────────────────────────────── */}
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
            Reset your<br />
            security<br />
            <span className="text-surface-dim">posture.</span>
          </h1>
          <p className="text-white/50 text-sm font-medium mt-8 max-w-[320px] leading-relaxed">
            Update your authentication credentials to regain access to your dashboard. This action will invalidate all other active sessions.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 pt-4 border-t border-white/10">
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
              Standard Compliance Framework: Token Rotation Active
            </p>
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Content ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-surface-lowest">
        <div className="w-full max-w-[420px] space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
              Reset Password
            </h1>
            <p className="text-on-surface-variant/60 text-sm font-medium mt-2">
              Enter the OTP sent to your email and your new password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="OTP Code"
              id="reset-otp"
              type="text"
              maxLength={6}
              placeholder="000000"
              value={formData.otp}
              onChange={(e) => handleChange("otp", e.target.value.replace(/\D/g, ''))}
              icon="pin"
              autoComplete="one-time-code"
              disabled={isLoading}
              className="text-center tracking-[0.5em] font-black text-xl"
            />

            <Input
              label="New Password"
              id="reset-new-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.newPassword}
              onChange={(e) => handleChange("newPassword", e.target.value)}
              icon="lock"
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-on-surface-variant/40 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              }
              disabled={isLoading}
            />

            <Input
              label="Confirm New Password"
              id="reset-confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              icon="lock"
              disabled={isLoading}
            />

            <Button
              type="submit"
              disabled={isLoading || !formData.otp || !formData.newPassword || !formData.confirmPassword}
              className="w-full h-13 py-4 gradient-primary text-white font-bold rounded-xl shadow-premium text-base tracking-tight hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  Change Password
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <Link 
              href="/forgot-password" 
              className="text-sm font-bold text-on-surface-variant/40 hover:text-primary transition-colors"
            >
              Didn't get the code? Resend
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
