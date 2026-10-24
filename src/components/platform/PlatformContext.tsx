"use client";

import { createContext, useContext } from "react";
import type { PlatformUser } from "@/lib/api/platform";

/** The signed-in console user (set by the console's layout). */
export const PlatformCtx = createContext<{ user: PlatformUser; signOut: () => void } | null>(null);
export const usePlatformUser = () => useContext(PlatformCtx)!;
