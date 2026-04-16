import React from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
}

export function DataTable<T>({ columns, data, className }: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-hidden rounded-2xl bg-surface-container-lowest", className)}>
      <table className="w-full text-left border-separate border-spacing-0">
        <thead>
          <tr className="bg-surface-container-high/40">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  "py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/5">
          {data.map((row, i) => (
            <tr
              key={i}
              className={cn(
                "group transition-colors duration-200 cursor-pointer",
                i % 2 === 0 ? "bg-white" : "bg-surface-container-lowest/40",
                "hover:bg-surface-container-low"
              )}
            >
              {columns.map((col, j) => (
                <td
                  key={j}
                  className={cn(
                    "py-4 px-6 text-sm text-primary font-medium tracking-tight",
                    col.className
                  )}
                >
                  {typeof col.accessor === "function" ? col.accessor(row) : (row[col.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
