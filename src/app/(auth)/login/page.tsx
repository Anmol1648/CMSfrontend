"use client";

/**
 * Login Page — Premium "Academic Architect" branded login.
 *
 * ALL logic is delegated to useAuth hook.
 * This file is PURELY presentational.
 */

import { useAuth } from "@/lib/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function LoginPage() {
  const {
    values,
    errors,
    handleChange,
    handleFormSubmit,
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,
    isLoading,
    mfaRequired,
    otpToken,
    setOtpToken,
    handleMfaSubmit,
  } = useAuth();

  return (
    <div className="min-h-screen flex" id="login-page">
      {/* ─── Left Panel: Branded Hero ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] bg-primary-gradient relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative Background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Architectural grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
          {/* Soft radial glow */}
          <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm flex items-center justify-center rounded-xl border border-white/10">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance
              </span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg tracking-tight leading-tight">Academic Architect</h2>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10 -mt-8">
          <h1 className="text-white text-5xl xl:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight">
            Designing the<br />
            future of<br />
            <span className="text-surface-dim">academic<br />excellence.</span>
          </h1>
          <p className="text-white/50 text-sm font-medium mt-8 max-w-[320px] leading-relaxed">
            A comprehensive management ecosystem for the modern institution. Secure, intuitive, and built for growth.
          </p>
        </div>

        {/* Stats & Trust */}
        <div className="relative z-10 space-y-6">
          <div className="flex gap-12">
            <div>
              <p className="text-white text-3xl font-black tracking-tighter">4.9/5</p>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">System Rating</p>
            </div>
            <div>
              <p className="text-white text-3xl font-black tracking-tighter">99.9%</p>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Uptime SLA</p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-white/10">
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
              Trusted by 200+ Institutions Worldwide
            </p>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-white/20" />
              <div className="w-2 h-2 rounded-full bg-white/40" />
              <div className="w-2 h-2 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Content ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-surface-lowest">
        <div className="w-full max-w-[420px] space-y-8">
          
          {!mfaRequired ? (
            <>
              {/* Header */}
              <div>
                <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
                  Welcome back
                </h1>
                <p className="text-on-surface-variant/60 text-sm font-medium mt-2">
                  Please enter your institutional credentials
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFormSubmit(e);
                }}
                className="space-y-6"
                id="login-form"
              >
                {/* Email Field */}
                <Input
                  label="Institutional Email"
                  id="login-email"
                  type="email"
                  placeholder="name@university.edu"
                  value={values.email}
                  error={errors.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  icon={
                    <span className="text-sm font-bold">@</span>
                  }
                  autoComplete="email"
                  disabled={isLoading}
                />

                {/* Password Field */}
                <Input
                  label="Password"
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={values.password}
                  error={errors.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  icon="lock"
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-on-surface-variant/40 hover:text-primary transition-colors"
                      tabIndex={-1}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  }
                  autoComplete="current-password"
                  disabled={isLoading}
                />

                {/* Forgot Password Link */}
                <div className="flex justify-end relative z-10">
                  <Link 
                    href="/forgot-password" 
                    className="text-[11px] font-bold text-primary hover:text-primary/70 transition-all uppercase tracking-widest px-1 py-1"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Remember Me */}
                <label className="flex items-center gap-3 cursor-pointer group" id="remember-me">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center transition-all duration-200 ${rememberMe
                        ? "bg-primary shadow-sm"
                        : "bg-surface-container-high group-hover:bg-surface-container-highest"
                      }`}
                    onClick={() => setRememberMe(!rememberMe)}
                  >
                    {rememberMe && (
                      <span className="material-symbols-outlined text-white text-xs" style={{ fontSize: '12px' }}>
                        check
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-on-surface-variant/60 font-medium select-none">
                    Stay signed in for 30 days
                  </span>
                </label>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-13 py-4 gradient-primary text-white font-bold rounded-xl shadow-premium text-base tracking-tight hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  id="login-submit"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* MFA Verification Stage */}
              <div>
                <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
                  Two-Factor Verification
                </h1>
                <p className="text-on-surface-variant/60 text-sm font-medium mt-2">
                  Please enter the 6-digit code from your authenticator app
                </p>
              </div>

              <form
                onSubmit={handleMfaSubmit}
                className="space-y-6"
                id="mfa-form"
              >
                <Input
                  label="Security Code"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                  className="text-2xl font-black tracking-[0.5em] text-center py-5 placeholder:text-on-surface-variant/20"
                  autoFocus
                  autoComplete="one-time-code"
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  disabled={isLoading || otpToken.length !== 6}
                  className="w-full h-13 py-4 gradient-primary text-white font-bold rounded-xl shadow-premium text-base tracking-tight hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  id="mfa-submit"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Sign In
                      <span className="material-symbols-outlined text-lg">verified_user</span>
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest hover:text-primary transition-colors text-center"
                >
                  Back to Sign In
                </button>
              </form>
            </>
          )}

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="material-symbols-outlined text-emerald-500 text-sm" style={{ fontSize: '14px' }}>
              verified_user
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
              256-Bit Secure Connection
            </span>
          </div>

          {/* Footer Links */}
          <div className="flex items-center justify-center gap-6 pt-4">
            {["Privacy", "Support", "Terms"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest hover:text-primary transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
