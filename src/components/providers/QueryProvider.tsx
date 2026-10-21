"use client";

import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { activity } from "@/lib/api/activity";
import { ActivityBar } from "@/components/ui/ActivityBar";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            // Retry once only when the server couldn't be reached; a 4xx answer won't change.
            retry: (failures, error) => failures < 1 && error instanceof ApiError && error.status === 0,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  // Something was saved: what is on screen reloads (in the background), and everything else is
  // reloaded when it is next shown. Several saves in a row reload once.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = activity.onSaved(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        queryClient.invalidateQueries();
      }, 200);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ActivityBar />
      {children}
    </QueryClientProvider>
  );
}
