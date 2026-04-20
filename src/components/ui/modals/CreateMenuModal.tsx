"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rbacApi } from "@/lib/api/endpoints/rbac.endpoints";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";

import { ModalComponent } from "../ModalProvider";
import { Toggle } from "@/components/ui/Toggle";

export const CreateMenuModal: ModalComponent<{ editMenu?: any }> = ({ close, editMenu }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    label: "",
    icon: "link",
    route: "",
    parent_id: null as string | null,
    sort_order: 0,
    is_active: true
  });

  React.useEffect(() => {
    if (editMenu) {
      setFormData({
        label: editMenu.label,
        icon: editMenu.icon || 'link',
        route: editMenu.route || '',
        parent_id: editMenu.parent_id,
        sort_order: editMenu.sort_order,
        is_active: editMenu.is_active
      });
    }
  }, [editMenu]);

  const { data: allMenus = [] } = useQuery({
    queryKey: ["menus"],
    queryFn: rbacApi.getMenus
  });

  const mutationFn = editMenu
    ? (data: typeof formData) => rbacApi.updateMenu(editMenu.id, data)
    : rbacApi.createMenu;

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus"] });
      close();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label || !formData.route) return;
    mutation.mutate(formData);
  };

  const parentOptions = [
    { value: "", label: "Root Level" },
    ...allMenus
      .filter((m: any) => !m.parent_id && m.id !== editMenu?.id) // Prevent setting self as parent
      .map((menu: any) => ({ value: menu.id, label: menu.label }))
  ];

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Menu Label"
            placeholder="e.g. 'Hostel MGMT'"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            required
          />
          <Input
            label="Icon Name"
            placeholder="Material Icon name"
            icon={formData.icon}
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          />
        </div>

        <Input
          label="Route Path"
          placeholder="e.g. '/hostel/dashboard'"
          icon="link"
          className="font-mono"
          value={formData.route}
          onChange={(e) => setFormData({ ...formData, route: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <CustomSelect
            label="Parent Menu (Optional)"
            options={parentOptions}
            defaultValue={formData.parent_id || ""}
            onChange={(val) => setFormData({ ...formData, parent_id: val || null })}
          />
          <Input
            label="Sort Order"
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="py-2">
          <Toggle 
            label="Menu is Active (visible in sidebar)" 
            defaultChecked={formData.is_active}
            onChange={(e: any) => setFormData({ ...formData, is_active: e.target.checked })}
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
            {mutation.isPending ? 'Saving...' : editMenu ? 'Update Menu' : 'Create Menu Item'}
          </Button>
        </div>
      </form>
    </div>
  );
};
