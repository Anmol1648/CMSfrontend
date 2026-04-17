"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface ProfileAvatarProps {
  currentImageUrl?: string;
  onImageUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export const ProfileAvatar = ({ currentImageUrl, onImageUpload, isLoading }: ProfileAvatarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await onImageUpload(file);
    }
  };

  const currentInitial = currentImageUrl ? null : "A";

  return (
    <div className="flex items-center gap-8 mb-4">
      <div className="relative group">
        <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-surface-container-high shadow-premium bg-primary/5 flex items-center justify-center">
          {currentImageUrl ? (
            <img 
              src={currentImageUrl} 
              alt="Profile" 
              className={cn("w-full h-full object-cover transition-transform duration-500 group-hover:scale-110", isLoading && "opacity-50")}
            />
          ) : (
            <span className="text-3xl font-black text-primary/30 tracking-tighter">
              {currentInitial}
            </span>
          )}
        </div>
        
        {/* Cam Button Overlay (Optional, matching image) */}
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-sm">photo_camera</span>
        </div>
      </div>

      <div className="flex-1">
        <h4 className="text-lg font-bold text-primary mb-1">Personal Information</h4>
        <p className="text-on-surface-variant text-sm mb-4">Your photo and primary details are visible across the faculty portal.</p>
        
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            className="h-10 px-6 font-bold bg-surface-container-high/50 hover:bg-surface-container-high"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            {isLoading ? "Uploading..." : "Change Photo"}
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
          />
        </div>
      </div>
    </div>
  );
};
