"use client";

import React, { useState, useEffect } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ProfileAvatar } from "@/components/settings/ProfileAvatar";
import { Input } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { useProfile } from "@/lib/hooks/useProfile";
import { UpdateProfileRequest } from "@/types/models/user.model";
import { useForm } from "@/lib/hooks/useForm";
import { required, minLength } from "@/lib/utils/validations";
import { QRCodeCanvas } from "qrcode.react";

export default function SettingsPage() {
  const {
    // Data & Loading
    profile, isLoading, isUpdating, isUpdatingAvatar, isChangingPassword,
    isSettingUpMfa, isEnablingMfa, isDisablingMfa,

    // Form State
    profileFormData, passwordForm,

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
    updateAvatar,
    refreshProfile
  } = useProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">Initialising Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="mb-12">
        <h1 className="text-display-md text-primary tracking-tight mb-2">Account Settings</h1>
        <p className="text-on-surface-variant text-lg">Manage your personal information, address details, and public profile settings.</p>
      </div>

      <div className="space-y-8">
        {/* ─── Personal Information ──────────────────────────────────── */}
        <SettingsSection
          title="Personal Information"
          description="Your photo and primary details are visible across the faculty portal."
        >
          <ProfileAvatar
            currentImageUrl={profile?.avatar_url}
            onImageUpload={async (file) => { await updateAvatar(file); }}
            isLoading={isUpdatingAvatar}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-8">
            <Input
              label="Phone Number"
              value={profileFormData.phone || ""}
              onChange={(e) => handleProfileInputChange("phone", e.target.value)}
              placeholder="+1 (555) 012-3456"
              icon="phone"
            />
            <CustomSelect
              label="Gender"
              defaultValue={profileFormData.gender}
              options={[
                { label: "Male", value: "Male" },
                { label: "Female", value: "Female" },
                { label: "Other", value: "Other" },
              ]}
              onChange={(val) => handleProfileInputChange("gender", val as any)}
            />
            <DatePicker
              label="Date of Birth"
              defaultValue={profileFormData.date_of_birth}
              onChange={(val) => handleProfileInputChange("date_of_birth", val)}
            />
          </div>
        </SettingsSection>

        {/* ─── Physical Address ────────────────────────────────────────── */}
        <SettingsSection
          title="Physical Address"
          description="Used for official university transcripts and physical correspondence."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
            <div className="md:col-span-2">
              <Input
                label="Street Address"
                value={profileFormData.address || ""}
                onChange={(e) => handleProfileInputChange("address", e.target.value)}
                placeholder="72 Architecture Plaza, Loft 4B"
                icon="location_on"
              />
            </div>
            <Input
              label="City"
              value={profileFormData.city || ""}
              onChange={(e) => handleProfileInputChange("city", e.target.value)}
              placeholder="New York"
            />
            <Input
              label="State"
              value={profileFormData.state || ""}
              onChange={(e) => handleProfileInputChange("state", e.target.value)}
              placeholder="NY"
            />
            <CustomSelect
              label="Country"
              defaultValue={profileFormData.country}
              options={[
                { label: "United States", value: "United States" },
                { label: "United Kingdom", value: "United Kingdom" },
                { label: "Canada", value: "Canada" },
                { label: "Australia", value: "Australia" },
              ]}
              onChange={(val) => handleProfileInputChange("country", val)}
            />
            <Input
              label="Pincode"
              value={profileFormData.pincode || ""}
              onChange={(e) => handleProfileInputChange("pincode", e.target.value)}
              placeholder="10012"
              icon="pin"
            />
          </div>
        </SettingsSection>

        {/* ─── Security ──────────────────────────────────────────────── */}
        <SettingsSection
          title="Security"
          description="Update your password to keep your account secure."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
            <Input
              label="Old Password"
              type={showOldPassword ? "text" : "password"}
              placeholder="••••••••"
              icon="lock_open"
              value={passwordForm.values.oldPassword}
              onChange={(e) => passwordForm.handleChange("oldPassword", e.target.value)}
              error={passwordForm.errors.oldPassword}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="text-on-surface-variant/40 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showOldPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              }
            />
            <Input
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              placeholder="••••••••"
              icon="lock"
              value={passwordForm.values.newPassword}
              onChange={(e) => passwordForm.handleChange("newPassword", e.target.value)}
              error={passwordForm.errors.newPassword}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-on-surface-variant/40 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showNewPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              }
            />
            <Input
              label="Confirm New Password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              icon="lock_reset"
              value={passwordForm.values.confirmPassword}
              onChange={(e) => passwordForm.handleChange("confirmPassword", e.target.value)}
              error={passwordForm.errors.confirmPassword}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-on-surface-variant/40 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showConfirmPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              }
            />
          </div>
          <div className="flex justify-start mt-6">
            <Button
              className="h-10 px-6 font-bold text-xs bg-surface-container-high text-primary hover:bg-primary hover:text-white"
              onClick={handleSavePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? "Updating Password..." : "Change Password"}
            </Button>
          </div>
        </SettingsSection>

        {/* ─── Multi-Factor Authentication ────────────────────────────── */}
        <SettingsSection
          title="Two-Factor Authentication"
          description="Add an extra layer of security to your account by requiring a 6-digit verification code from your authenticator app."
        >
          <div className="flex items-center justify-between p-6 bg-surface-container-low rounded-2xl border border-outline-variant/5 group/mfa hover:border-primary/10 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${profile?.user?.mfa_enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {profile?.user?.mfa_enabled ? 'verified_user' : 'security'}
                </span>
              </div>
              <div>
                <p className="font-bold text-sm text-on-surface">
                  Authenticator / TOTP
                </p>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${profile?.user?.mfa_enabled ? 'text-emerald-500' : 'text-on-surface-variant/40'}`}>
                  {profile?.user?.mfa_enabled ? 'Currently Active' : 'Not Configured'}
                </p>
              </div>
            </div>

            {profile?.user?.mfa_enabled ? (
              <button
                onClick={handleDisableMfa}
                disabled={isDisablingMfa}
                className="text-xs font-bold text-error uppercase tracking-widest hover:bg-error/5 px-4 py-2 rounded-lg transition-all"
              >
                {isDisablingMfa ? 'Disabling...' : 'Disable MFA'}
              </button>
            ) : (
              <Button
                onClick={handleInitiateMfa}
                disabled={isSettingUpMfa}
                className="h-10 px-6 font-bold text-xs gradient-primary text-white"
              >
                {isSettingUpMfa ? 'Initialising...' : 'Enable MFA'}
              </Button>
            )}
          </div>

          {/* MFA Setup is now handled via the centralized ModalProvider system */}
        </SettingsSection>

        {/* ─── Actions ───────────────────────────────────────────────── */}
        <div className="flex justify-end items-center gap-6 pt-8 border-t border-outline-variant/10">
          <button
            className="text-sm font-bold text-on-surface-variant/60 hover:text-primary transition-all"
            onClick={() => refreshProfile()}
          >
            Discard Changes
          </button>
          <Button
            className="h-12 px-12 font-bold shadow-premium gradient-primary text-white text-sm"
            onClick={handleSaveProfile}
            disabled={isUpdating}
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}