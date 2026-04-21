"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "@/lib/api/endpoints/tenant.endpoints";
import { Input } from "../Input";
import { Button } from "../Button";
import { ModalComponent } from "../ModalProvider";

export const OnboardTenantModal: ModalComponent = ({ close }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    domain: "",
  });

  const onboardMutation = useMutation({
    mutationFn: tenantApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      close();
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setFormData({ ...formData, name, slug });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.slug || !formData.domain) return;
    onboardMutation.mutate(formData);
  };

  const isValid = formData.name.trim() && formData.slug.trim() && formData.domain.trim();

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary-fixed/30 mb-2">
        <span className="material-symbols-outlined text-primary text-xl">info</span>
        <p className="text-xs text-primary font-medium leading-relaxed">
          Onboarding creates a new isolated database, generates credentials, and runs initial migrations automatically.
        </p>
      </div>

      <Input
        label="College Name"
        placeholder="e.g. Delhi Technical University"
        value={formData.name}
        onChange={handleNameChange}
        icon="school"
      />
      <Input
        label="URL Slug"
        placeholder="e.g. delhi-technical-university"
        value={formData.slug}
        onChange={(e) =>
          setFormData({
            ...formData,
            slug: e.target.value
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "")
              .replace(/-+/g, "-"),
          })
        }
        icon="link"
      />
      <Input
        label="Domain"
        placeholder="e.g. dtu.ac.in"
        value={formData.domain}
        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
        icon="language"
      />

      {onboardMutation.isError && (
        <div className="p-3 rounded-xl bg-error-container/30 text-error text-xs font-bold">
          {(onboardMutation.error as any)?.message || "Failed to onboard tenant. Please try again."}
        </div>
      )}

      <div className="pt-4 flex gap-3">
        <Button
          onClick={close}
          variant="secondary"
          className="flex-1 font-bold h-12"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={onboardMutation.isPending || !isValid}
          className="flex-1 bg-primary text-white font-bold h-12 shadow-premium hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {onboardMutation.isPending ? "Provisioning..." : "Onboard Tenant"}
        </Button>
      </div>
    </div>
  );
};
