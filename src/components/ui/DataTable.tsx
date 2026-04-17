import React from "react";
import { cn } from "@/lib/utils";
import { Pagination } from "./Pagination";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  pagination?: {
    currentPage: number;
    totalPage: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T>({ columns, data, className, pagination }: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-hidden rounded-2xl bg-surface-container-lowest flex flex-col", className)}>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-surface-container-high/40 text-on-surface">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    "py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] border-b border-outline-variant/20",
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

      {pagination && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 bg-surface-container-low/30 border-t border-outline-variant/10">
          <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
            Showing {data.length} entries of roughly {pagination.totalPage * 10} records
          </p>
          <Pagination 
            currentPage={pagination.currentPage}
            totalPage={pagination.totalPage}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}
