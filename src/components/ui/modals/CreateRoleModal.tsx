"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rbacApi } from "@/lib/api/endpoints/rbac.endpoints";
import { Input } from "../Input";
import { CustomSelect } from "../CustomSelect";
import { Button } from "../Button";
import { TextArea } from "../TextArea";
import { ModalComponent } from "../ModalProvider";

export const CreateRoleModal: ModalComponent<{ editRole?: any }> = ({ close, editRole }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    scope: 'tenant',
  });

  useEffect(() => {
    if (editRole) {
      setFormData({
        name: editRole.name,
        slug: editRole.slug,
        description: editRole.description || '',
        scope: editRole.scope,
      });
    }
  }, [editRole]);

  const mutationFn = editRole
    ? (data: typeof formData) => rbacApi.updateRole(editRole.id, data)
    : rbacApi.createRole;

  const roleMutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      close();
    }
  });

  const handleCreate = () => {
    if (!formData.name || !formData.slug) return;
    roleMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 pt-4">
      <Input 
        label="Role Name"
        placeholder="e.g. Department Head"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
      <Input 
        label="Role Slug"
        placeholder="e.g. dept-head"
        value={formData.slug}
        disabled={!!editRole} // Slug shouldn't change easily once created due to relationships
        onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
      />
      <TextArea
        label="Description"
        placeholder="Brief description of what this role entails..."
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
      />
      <CustomSelect 
        label="Hierarchy Scope"
        options={[
          { label: 'Global (System Wide)', value: 'global' },
          { label: 'Tenant (College Only)', value: 'tenant' },
          { label: 'Department (Dept Only)', value: 'department' },
          { label: 'Self (Own Records Only)', value: 'self' },
        ]}
        defaultValue={formData.scope}
        onChange={(val) => setFormData({...formData, scope: val})}
      />
      <div className="pt-4 flex gap-3">
        <Button 
          onClick={close}
          variant="secondary"
          className="flex-1 font-bold h-12"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleCreate}
          disabled={roleMutation.isPending || !formData.name || !formData.slug}
          className="flex-1 bg-primary text-white font-bold h-12 shadow-premium hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {roleMutation.isPending ? 'Saving...' : editRole ? 'Update Role' : 'Create Role'}
        </Button>
      </div>
    </div>
  );
};
