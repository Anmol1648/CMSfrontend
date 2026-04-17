"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination = ({ currentPage, totalPage, onPageChange, className }: PaginationProps) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPage <= maxVisible) {
      for (let i = 1; i <= totalPage; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPage - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPage - 2) pages.push("...");
      pages.push(totalPage);
    }
    return pages;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-container-low text-on-surface hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <span className="material-symbols-outlined text-lg">chevron_left</span>
      </button>

      {getPageNumbers().map((page, index) => (
        <React.Fragment key={index}>
          {page === "..." ? (
            <span className="w-10 h-10 flex items-center justify-center text-on-surface-variant font-bold">...</span>
          ) : (
            <button
              onClick={() => onPageChange(page as number)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                currentPage === page 
                  ? "bg-primary text-white shadow-premium" 
                  : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
              )}
            >
              {page}
            </button>
          )}
        </React.Fragment>
      ))}

      <button
        onClick={() => onPageChange(Math.min(totalPage, currentPage + 1))}
        disabled={currentPage === totalPage}
        className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-container-low text-on-surface hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <span className="material-symbols-outlined text-lg">chevron_right</span>
      </button>
    </div>
  );
};
