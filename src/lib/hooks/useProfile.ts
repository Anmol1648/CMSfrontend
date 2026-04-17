"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModal } from "@/components/ui/ModalProvider";
import { userEndpoints } from "../api/endpoints/user.endpoints";
import { UpdateProfileRequest } from "@/types/models/user.model";
import { useToast } from "@/components/ui/ToastProvider";
import { useForm } from "./useForm";
import { required, minLength } from "../utils/validations";

export const useProfile = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { openModal, closeModal } = useModal();

  const profileQuery = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => userEndpoints.getProfile(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const profile = profileQuery.data?.data;

  // ─── Profile Form State ───────────────────────────────────────────
  const [profileFormData, setProfileFormData] = useState<UpdateProfileRequest>({});

  // ─── Password Visibility State ───────────────────────────────────
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ─── MFA UI State ───────────────────────────────────────────────
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaVerificationCode, setMfaVerificationCode] = useState("");

  // ─── Password Form Hook ──────────────────────────────────────────
  const passwordForm = useForm({
    initialValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
    rules: {
      oldPassword: [required("Current password is required")],
      newPassword: [
        required("New password is required"),
        minLength(8, "Password must be at least 8 characters")
      ],
      confirmPassword: [
        required("Please confirm your password"),
        (val) => val === passwordForm.values.newPassword || "Passwords do not match"
      ]
    }
  });

  // Sync profile data to local state when it loads
  useEffect(() => {
    if (profile) {
      const normalizedGender = profile.gender
        ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).toLowerCase()
        : "Male";

      setProfileFormData({
        phone: profile.phone || "",
        gender: normalizedGender as any,
        date_of_birth: profile.date_of_birth || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        country: profile.country || "United States",
        pincode: profile.pincode || "",
      });
    }
  }, [profile]);

  const handleProfileInputChange = (field: keyof UpdateProfileRequest, value: string) => {
    setProfileFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => userEndpoints.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      showToast("Profile updated successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to update profile", "error");
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: (file: File) => userEndpoints.updateAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      showToast("Avatar updated successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to update avatar", "error");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: userEndpoints.changePassword,
    onSuccess: () => {
      showToast("Password changed successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to change password", "error");
    },
  });

  const setupMfaMutation = useMutation({
    mutationFn: userEndpoints.setupMfa,
    onError: (error: any) => {
      showToast(error.message || "Failed to initiate MFA setup", "error");
    },
  });

  const enableMfaMutation = useMutation({
    mutationFn: (token: string) => userEndpoints.enableMfa(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      showToast("MFA enabled successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to enable MFA", "error");
    },
  });

  const disableMfaMutation = useMutation({
    mutationFn: ({ password, token }: { password: string; token: string }) => 
      userEndpoints.disableMfa(password, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      showToast("MFA disabled successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to disable MFA", "error");
    },
  });

  // ─── Final Handlers ───────────────────────────────────────────────
  const handleSaveProfile = async () => {
    await updateProfileMutation.mutateAsync(profileFormData);
  };

  const handleSavePassword = passwordForm.handleSubmit(async (data) => {
    try {
      await changePasswordMutation.mutateAsync({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      passwordForm.resetForm();
    } catch (err) {
      // Error handled by mutation toast
    }
  });

  const handleInitiateMfa = async () => {
    const response = await setupMfaMutation.mutateAsync();
    if (response.status === "success" && response.data) {
      setMfaQrCode(response.data.qrCode);

      openModal("MfaSetup", {
        qrCode: response.data.qrCode,
        onVerify: handleVerifyAndEnableMfa,
        isVerifying: enableMfaMutation.isPending
      });
    }
  };

  const handleVerifyAndEnableMfa = async (code: string) => {
    if (code.length === 6) {
      await enableMfaMutation.mutateAsync(code);
      closeModal();
      setMfaVerificationCode("");
      setMfaQrCode(null);
    }
  };

  const handleDisableMfa = () => {
    openModal("MfaDisable", {
      isDisabling: disableMfaMutation.isPending,
      onConfirm: async (password: string, token: string) => {
        try {
          await disableMfaMutation.mutateAsync({ password, token });
          closeModal();
        } catch (error) {
          // Error handled by disableMfaMutation onError
        }
      }
    });
  };


  return {
    // Data
    profile,
    isLoading: profileQuery.isLoading,
    isUpdating: updateProfileMutation.isPending,
    isUpdatingAvatar: updateAvatarMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isSettingUpMfa: setupMfaMutation.isPending,
    isEnablingMfa: enableMfaMutation.isPending,
    isDisablingMfa: disableMfaMutation.isPending,

    // Form State
    profileFormData,
    passwordForm,

    // UI Visibility
    showOldPassword, setShowOldPassword,
    showNewPassword, setShowNewPassword,
    showConfirmPassword, setShowConfirmPassword,
    mfaQrCode,
    mfaVerificationCode, setMfaVerificationCode,

    // Handlers
    handleProfileInputChange,
    handleSaveProfile,
    handleSavePassword,
    handleInitiateMfa,
    handleVerifyAndEnableMfa,
    handleDisableMfa,
    updateAvatar: updateAvatarMutation.mutateAsync,
    refreshProfile: profileQuery.refetch,
  };
};
