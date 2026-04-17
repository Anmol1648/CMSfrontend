"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  label?: string;
  defaultValue?: string; // Format: YYYY-MM-DD
  onChange?: (value: string) => void;
  className?: string;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const DatePicker = ({ label, defaultValue, onChange, className }: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState<Date>(new Date());

  useEffect(() => {
    if (defaultValue) {
      const date = new Date(defaultValue);
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
        setViewDate(date);
      }
    }
  }, [defaultValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newDate);
    setIsOpen(false);
    
    if (onChange) {
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, "0");
      const date = String(newDate.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${date}`);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const displayDateStr = selectedDate 
    ? `${String(selectedDate.getDate()).padStart(2, '0')}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${selectedDate.getFullYear()}`
    : "Select Date...";

  return (
    <div className={cn("flex flex-col gap-2 group", className)} ref={dropdownRef}>
      {label && <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">{label}</label>}
      
      <div className="relative group/input">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-surface-container-low flex justify-between items-center rounded-xl px-4 py-3 text-sm font-bold transition-all outline-none cursor-pointer",
            selectedDate ? "text-primary" : "text-on-surface-variant",
            isOpen ? "ring-2 ring-primary/10" : ""
          )}
        >
          <span>{displayDateStr}</span>
          <div className={cn(
            "pointer-events-none transition-colors flex items-center",
            isOpen ? "text-primary" : "text-on-surface-variant"
          )}>
            <span className="material-symbols-outlined text-xl">calendar_today</span>
          </div>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 p-4 bg-surface-container-low rounded-xl shadow-lg border border-black/5 z-50 w-72">
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={handlePrevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <div className="font-bold text-sm text-primary">
                {MONTHS[currentMonth]} {currentYear}
              </div>
              <button 
                onClick={handleNextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-on-surface-variant/60">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear;
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;

                return (
                  <button
                    key={day}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateSelect(day);
                    }}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium transition-colors mx-auto",
                      isSelected 
                        ? "bg-primary text-white shadow-sm" 
                        : isToday 
                          ? "bg-primary/10 text-primary"
                          : "text-on-surface hover:bg-surface-container-high"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
