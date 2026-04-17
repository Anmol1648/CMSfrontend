"use client";

/**
 * useAuth hook — encapsulates ALL login page logic.
 * The page component should have zero business logic.
 *
 * Flow: useForm (validation) → useMutation (API) → Redux (store) → router (redirect)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "@/lib/hooks/useForm";
import { useAppDispatch } from "@/lib/store/hooks";
import { setCredentials, logout } from "@/lib/store/slices/authSlice";

import { authApi } from "@/lib/api/endpoints/auth.endpoints";
import { useToast } from "@/components/ui/ToastProvider";
import { required, email as emailRule } from "@/lib/utils/validations";

export const useAuth = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // ─── MFA State ─────────────────────────────────────────────────────────────
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [otpToken, setOtpToken] = useState("");

  // ─── Form State & Validation ──────────────────────────────────────────────
  const { values, errors, handleChange, handleSubmit } = useForm({
    initialValues: { email: "", password: "" },
    rules: {
      email: [
        required("Email is required"),
        emailRule("Please enter a valid email address"),
      ],
      password: [required("Password is required")],
    },
  });

  // ─── TanStack Mutation ────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if (data.status === 'mfa_required') {
        setMfaRequired(true);
        setMfaToken(data.mfaToken || null);
        showToast("Verification code required", "info");
        return;
      }

      // Store credentials in Redux (also persists to localStorage)
      dispatch(
        setCredentials({
          user: data.user!,
          accessToken: data.accessToken!,
          refreshToken: data.refreshToken!,
        })
      );

      showToast("Login successful. Welcome back!", "success");

      // Redirect to dashboard
      router.push("/");
    },
    onError: (error: any) => {
      const message =
        error?.message || "Login failed. Please check your credentials.";
      showToast(message, "error");
    },
  });

  const mfaVerifyMutation = useMutation({
    mutationFn: ({ token, code }: { token: string, code: string }) => authApi.mfaVerify(token, code),
    onSuccess: (data) => {
      dispatch(
        setCredentials({
          user: data.user!,
          accessToken: data.accessToken!,
          refreshToken: data.refreshToken!,
        })
      );
      showToast("Verification successful. Welcome back!", "success");
      router.push("/");
    },
    onError: (error: any) => {
      showToast(error?.message || "Invalid verification code", "error");
    },
  });

  // ─── Submit Handler (delegated from form) ─────────────────────────────────
  const handleFormSubmit = handleSubmit((data) => {
    loginMutation.mutate({
      email: data.email,
      password: data.password,
    });
  });

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaToken && otpToken.length === 6) {
      mfaVerifyMutation.mutate({ token: mfaToken, code: otpToken });
    }
  };

  // ─── Logout Handlers ──────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      dispatch(logout());
      showToast("Logged out successfully", "success");
      router.push("/login"); // or wherever the login page is
    }
  };

  const handleLogoutAll = async () => {
    try {
      await authApi.logoutAll();
      showToast("Logged out from all devices", "success");
    } catch (error: any) {
      showToast(error?.message || "Logout all failed", "error");
    } finally {
      dispatch(logout());
      router.push("/login");
    }
  };

  return {
    // Stage
    mfaRequired,
    otpToken,
    setOtpToken,

    // Form
    values,
    errors,
    handleChange,
    handleFormSubmit,
    handleMfaSubmit,

    // Logout
    handleLogout,
    handleLogoutAll,

    // UI state
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,

    // Loading
    isLoading: loginMutation.isPending || mfaVerifyMutation.isPending,
  };
};

