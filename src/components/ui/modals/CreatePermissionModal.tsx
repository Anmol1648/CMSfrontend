"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rbacApi } from "@/lib/api/endpoints/rbac.endpoints";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";

import { ModalComponent } from "../ModalProvider";

export const CreatePermissionModal: ModalComponent<{ editPermission?: any }> = ({ close, editPermission }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    resource: "",
    action: "read",
    description: ""
  });

  React.useEffect(() => {
    if (editPermission) {
      setFormData({
        resource: editPermission.resource,
        action: editPermission.action,
        description: editPermission.description || ''
      });
    }
  }, [editPermission]);

  const mutationFn = editPermission
    ? (data: typeof formData) => rbacApi.updatePermission(editPermission.id, data)
    : rbacApi.createPermission;

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      close();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.resource) return;
    mutation.mutate(formData);
  };

  const actionOptions = [
    { value: 'create', label: 'CREATE' },
    { value: 'read', label: 'READ' },
    { value: 'update', label: 'UPDATE' },
    { value: 'delete', label: 'DELETE' },
    { value: 'approve', label: 'APPROVE' },
    { value: 'export', label: 'EXPORT' },
    { value: 'manage', label: 'MANAGE' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Resource Name"
          placeholder="e.g. 'inventory', 'hostel', 'library'"
          icon="shield"
          value={formData.resource}
          onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
          required
          autoFocus
        />

        <CustomSelect
          label="Action Type"
          options={actionOptions}
          defaultValue={formData.action}
          onChange={(val) => setFormData({ ...formData, action: val })}
        />

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1 transition-colors">
            Description (Optional)
          </label>
          <textarea
            placeholder="Explain what this permission covers..."
            className="w-full bg-surface-container-low p-4 rounded-xl border-none outline-none transition-all duration-300 text-sm placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/10 min-h-[120px] resize-none"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={close}
            className="flex-1 h-14 rounded-2xl font-bold bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-none"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-[2] h-14 bg-primary text-white rounded-2xl font-bold shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-all"
          >
            {mutation.isPending ? 'Saving...' : editPermission ? 'Update Permission' : 'Create Permission'}
          </Button>
        </div>
      </form>
    </div>
  );
};
