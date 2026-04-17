"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "./ToastProvider";
import { Button } from "./Button";

interface FileUploadProps {
  label: string;
  description?: string;
  accept?: string;
  maxSize?: number; // in MB
  onFileSelect: (file: File) => void;
  className?: string;
}

export const FileUpload = ({
  label,
  description = "Drag and drop your files here, or click to browse",
  accept = "*",
  maxSize = 10,
  onFileSelect,
  className
}: FileUploadProps) => {
  const { showToast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  };

  const validateAndSelect = (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      showToast(`File is too large. Maximum size is ${maxSize}MB.`, "error");
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary px-1">
        {label}
      </label>
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center text-center",
          isDragging 
            ? "border-primary bg-primary/5 ring-4 ring-primary/5" 
            : "border-outline-variant/30 bg-surface-container-lowest/50 hover:border-primary/40 hover:bg-surface-lowest"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
        />

        {selectedFile ? (
          <div className="w-full flex items-center gap-4 animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-on-surface-variant font-medium">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button 
              variant="tertiary" 
              onClick={clearFile}
              className="h-8 w-8 p-0 rounded-lg hover:bg-error/10 hover:text-error"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </Button>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-3xl text-primary/40">
                cloud_upload
              </span>
            </div>
            <p className="text-sm font-bold text-on-surface tracking-tight mb-1">
              {description}
            </p>
            <p className="text-[10px] text-on-surface-variant/40 font-black uppercase tracking-widest">
              Maximum Size: {maxSize}MB
            </p>
          </>
        )}
      </div>
    </div>
  );
};
