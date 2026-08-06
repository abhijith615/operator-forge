"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// `domMax`, not `domAnimation` — the sidebar's active indicator is a shared
// `layoutId` element, and layout projection ships only in the max bundle.
import { LazyMotion, MotionConfig, domMax } from "framer-motion";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { easing } from "@/lib/motion";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domMax} strict={false}>
        <MotionConfig
          reducedMotion="user"
          transition={{ duration: 0.4, ease: easing.outExpo }}
        >
          <TooltipProvider delayDuration={220} skipDelayDuration={400}>
            {children}
            {/* Bottom-right is the mission event stack; app toasts go up top. */}
            <Toaster
              position="top-center"
              offset={72}
              toastOptions={{
                classNames: {
                  toast:
                    "glass !rounded-xl !text-hi !text-[13.5px] !shadow-2xl !shadow-black/70",
                  description: "!text-mid",
                },
              }}
            />
          </TooltipProvider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}
