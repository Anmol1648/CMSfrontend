import React from 'react';

interface MenuNode {
  id: string;
  label: string;
  parent_id?: string | null;
  children?: MenuNode[];
}

interface AssignedMenu {
  menu_id: string;
  visible: boolean;
}

interface MenuTreeToggleProps {
  menus: MenuNode[];
  assignedMenus: AssignedMenu[];
  onChange: (newAssignments: AssignedMenu[]) => void;
  readOnly?: boolean;
}

export const MenuTreeToggle: React.FC<MenuTreeToggleProps> = ({
  menus,
  assignedMenus,
  onChange,
  readOnly = false,
}) => {
  const visibleMenuSet = new Set(assignedMenus.filter(m => m.visible).map(m => m.menu_id));

  const handleToggle = (menuId: string, currentStatus: boolean) => {
    if (readOnly) return;
    const newStatus = !currentStatus;
    
    // Create new array, replacing if exists, appending if not
    let newAssignments = [...assignedMenus];
    const existingIndex = newAssignments.findIndex(am => am.menu_id === menuId);
    
    if (existingIndex !== -1) {
      newAssignments[existingIndex].visible = newStatus;
    } else {
      newAssignments.push({ menu_id: menuId, visible: newStatus });
    }
    
    onChange(newAssignments);
  };

  const renderNode = (node: MenuNode, level: number = 0) => {
    const isVisible = visibleMenuSet.has(node.id);

    return (
      <div key={node.id} className="w-full">
        <div 
          className={`flex items-center justify-between p-3 border-b border-outline-variant/10 hover:bg-primary/5 transition-colors ${level === 0 ? 'bg-surface' : 'bg-surface-container-lowest'}`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60">
              {node.children && node.children.length > 0 ? 'folder' : 'article'}
            </span>
            <span className="font-semibold text-sm text-on-surface">{node.label}</span>
          </div>
          
          <button
            onClick={() => handleToggle(node.id, isVisible)}
            disabled={readOnly}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
              isVisible ? 'bg-primary' : 'bg-surface-container-highest'
            } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out shadow-sm ${
                isVisible ? 'translate-x-1.5' : '-translate-x-1.5'
              }`}
            />
          </button>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="flex flex-col w-full border-l-2 border-outline-variant/10 ml-6">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!menus || menus.length === 0) {
    return (
      <div className="bg-surface-container-low p-8 text-center rounded-2xl border border-outline-variant/10">
        <span className="material-symbols-outlined text-[32px] text-on-surface-variant/40 mb-2">account_tree</span>
        <p className="text-on-surface-variant text-sm">No menus available in the system.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden flex flex-col">
      <div className="bg-surface-container-high/50 px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
        <span className="font-bold text-sm text-on-surface-variant uppercase tracking-widest">Navigation Menus</span>
        <span className="font-bold text-sm text-on-surface-variant uppercase tracking-widest">Visibility</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {menus.map(menu => renderNode(menu, 0))}
      </div>
    </div>
  );
};
