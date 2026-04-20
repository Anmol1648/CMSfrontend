import React from 'react';

interface SimulationData {
  role: { id: string; name: string; slug: string };
  permissions: { resource: string; action: string; condition?: any }[];
  menuTree: any[];
  fieldPermissions: any[];
}

export const RoleSimulator: React.FC<{ data: SimulationData }> = ({ data }) => {
  return (
    <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 space-y-8">
      <div>
        <h3 className="text-lg font-black text-primary flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[20px]">policy</span>
          Permission Highlights
        </h3>
        {data.permissions.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No permissions assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.permissions.map((p, idx) => (
              <span key={idx} className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg uppercase tracking-wider flex border border-primary/20 items-center gap-1 shadow-sm">
                {p.resource}:{p.action}
                {p.condition && (
                  <span className="material-symbols-outlined text-[12px] opacity-70" title={JSON.stringify(p.condition)}>info</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-black text-primary flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px]">account_tree</span>
            Visible Navigation Options
          </h3>
          {data.menuTree.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No menus mapped to this role.</p>
          ) : (
            <pre className="text-xs p-4 bg-surface rounded-xl overflow-x-auto text-on-surface border border-outline/10 shadow-inner">
              {JSON.stringify(data.menuTree, null, 2)}
            </pre>
          )}
        </div>

        <div>
          <h3 className="text-lg font-black text-primary flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px]">data_object</span>
            Field-Level Access
          </h3>
          {data.fieldPermissions.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Unrestricted standard fields or no specific field mappings.</p>
          ) : (
            <ul className="space-y-2">
              {data.fieldPermissions.map((fp, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm p-3 bg-surface rounded-xl border border-outline/10 shadow-sm">
                  <span className="font-bold min-w-[80px]">{fp.model_name}</span>
                  <span className="text-on-surface-variant flex-1">{fp.field_name}</span>
                  <div className="flex gap-2">
                    {fp.can_read ? <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded font-black uppercase">Read</span> : <span className="text-[10px] bg-error/10 text-error px-2 py-1 rounded font-black uppercase">No Read</span>}
                    {fp.can_write ? <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded font-black uppercase">Write</span> : <span className="text-[10px] bg-error/10 text-error px-2 py-1 rounded font-black uppercase">No Write</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
