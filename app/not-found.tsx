import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Aurora, GridField } from "@/components/visuals/aurora";

export default function NotFound() {
  return (
    <main
      id="main"
      className="relative grid min-h-dvh place-items-center overflow-hidden px-6"
    >
      <Aurora />
      <GridField />

      <div className="relative max-w-md text-center">
        <LogoMark className="mx-auto size-8" />
        <p className="mt-8 font-mono text-[10.5px] tracking-[0.22em] text-ember-500 uppercase">
          Off the floor plan
        </p>
        <h1 className="mt-5 text-[clamp(2.2rem,7vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-gradient">
          There is no bay here.
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-mid text-balance">
          The panel you asked for is not part of this hub. Nothing has broken —
          you have simply walked past the last aisle.
        </p>
        <Button asChild variant="secondary" size="lg" className="mt-9">
          <Link href="/">
            <ArrowLeft className="transition-transform duration-300 ease-out-expo group-hover/btn:-translate-x-0.5" />
            Back to the entrance
          </Link>
        </Button>
      </div>
    </main>
  );
}
