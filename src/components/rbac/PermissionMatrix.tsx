import React, { useMemo } from 'react';

interface PermissionDef {
  id: string;
  resource: string;
  action: string;
}

interface AssignedPermission {
  permission_id: string;
  condition?: any;
}

interface PermissionMatrixProps {
  availablePermissions: PermissionDef[];
  assignedPermissions: AssignedPermission[];
  onChange: (newAssignments: AssignedPermission[]) => void;
  readOnly?: boolean;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  availablePermissions,
  assignedPermissions,
  onChange,
  readOnly = false,
}) => {
  // Extract unique resources and actions
  const resources = useMemo(() => Array.from(new Set(availablePermissions.map(p => p.resource))).sort(), [availablePermissions]);
  const defaultActions = ['create', 'read', 'update', 'delete', 'assign-role'];
  const actions = useMemo(() => {
    const allA = Array.from(new Set(availablePermissions.map(p => p.action)));
    return allA.sort((a, b) => {
      const ia = defaultActions.indexOf(a);
      const ib = defaultActions.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [availablePermissions]);

  const assignedSet = useMemo(() => new Set(assignedPermissions.map(ap => ap.permission_id)), [assignedPermissions]);

  const handleToggle = (permissionId: string) => {
    if (readOnly) return;
    const isAssigned = assignedSet.has(permissionId);
    if (isAssigned) {
      onChange(assignedPermissions.filter(ap => ap.permission_id !== permissionId));
    } else {
      onChange([...assignedPermissions, { permission_id: permissionId }]);
    }
  };

  const handleToggleRow = (resource: string) => {
    if (readOnly) return;
    const resourcePerms = availablePermissions.filter(p => p.resource === resource);
    const allAssigned = resourcePerms.every(p => assignedSet.has(p.id));
    
    if (allAssigned) {
      const idsToRemove = new Set(resourcePerms.map(p => p.id));
      onChange(assignedPermissions.filter(ap => !idsToRemove.has(ap.permission_id)));
    } else {
      const newAssignments = [...assignedPermissions];
      resourcePerms.forEach(p => {
        if (!assignedSet.has(p.id)) {
          newAssignments.push({ permission_id: p.id });
        }
      });
      onChange(newAssignments);
    }
  };

  return (
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-container-high/50 text-on-surface-variant font-bold border-b border-outline-variant/10">
            <tr>
              <th className="px-6 py-4 rounded-tl-xl w-64">Resource</th>
              {actions.map(action => (
                <th key={action} className="px-4 py-4 text-center capitalize">
                  {action}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {resources.map(resource => {
              const rowPerms = availablePermissions.filter(p => p.resource === resource);
              const allAssigned = rowPerms.length > 0 && rowPerms.every(p => assignedSet.has(p.id));
              
              return (
                <tr key={resource} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <button 
                      onClick={() => handleToggleRow(resource)}
                      disabled={readOnly}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        allAssigned ? 'bg-primary border-primary text-white' : 'border-outline-variant bg-surface'
                      }`}
                    >
                      {allAssigned && <span className="material-symbols-outlined text-[12px] font-bold shadow-sm">check</span>}
                    </button>
                    <span className="font-semibold text-on-surface capitalize tracking-tight">{resource}</span>
                  </td>
                  {actions.map(action => {
                    const perm = availablePermissions.find(p => p.resource === resource && p.action === action);
                    if (!perm) return <td key={action} className="px-4 py-4 text-center text-on-surface-variant/20">-</td>;
                    
                    const isAssigned = assignedSet.has(perm.id);
                    return (
                      <td key={action} className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggle(perm.id)}
                          disabled={readOnly}
                          className={`w-5 h-5 rounded-md border inline-flex items-center justify-center transition-all ${
                            isAssigned 
                              ? 'bg-primary border-primary text-white shadow-premium scale-100' 
                              : 'border-outline/30 bg-surface shadow-inner scale-95 hover:border-primary/50 cursor-pointer'
                          }`}
                        >
                          {isAssigned && <span className="material-symbols-outlined text-[14px] font-black">check</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
