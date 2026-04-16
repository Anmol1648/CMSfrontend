"use client";

import React, { useState, useEffect } from "react";

export function SplashProvider({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Determine the total time the splash is on screen
    const timer = setTimeout(() => {
      setFade(true);
      // Wait for the fade-out animation to finish before removing from DOM
      setTimeout(() => setShowSplash(false), 800); 
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash && (
        <div
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary-gradient text-white overflow-hidden ${
            fade ? "animate-fade-out pointer-events-none" : ""
          }`}
        >
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
             <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-white/5 rounded-full blur-3xl" />
             <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          </div>

          {/* Logo / Brand Name */}
          <div className="relative z-10 flex flex-col items-center mt-[-10vh]">
            <div className="animate-zoom-in">
              <div className="w-16 h-16 bg-white flex items-center justify-center rounded-2xl mb-6 shadow-premium mx-auto shadow-white/10">
                <span className="material-symbols-outlined text-primary text-4xl">account_balance</span>
              </div>
              <h1 className="text-display-lg text-white mb-2 tracking-tight text-center">
                Academic<br />Architect
              </h1>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <p className="text-surface-dim font-inter text-sm tracking-widest uppercase font-medium mt-8 text-center flex items-center gap-3">
                <span className="w-8 h-[1px] bg-surface-dim/40 block"></span>
                By Lizone Design
                <span className="w-8 h-[1px] bg-surface-dim/40 block"></span>
              </p>
            </div>
            
            {/* Loading Bar */}
            <div className="w-48 h-1 bg-white/10 rounded-full mt-12 overflow-hidden mx-auto">
              <div className="h-full bg-white rounded-full animate-[progress_1.5s_ease-in-out_forwards]" 
                   style={{ width: "0%", animationName: "progress", animationFillMode: "forwards" }} />
            </div>
            <style jsx>{`
              @keyframes progress {
                0% { width: 0%; }
                100% { width: 100%; }
              }
            `}</style>
          </div>
        </div>
      )}
      
      <div className={!showSplash || fade ? "block" : "hidden"}>
        {children}
      </div>
    </>
  );
}
