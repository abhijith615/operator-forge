"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Film, Play, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Aurora, GridField } from "@/components/visuals/aurora";
import { FIRST_SHIFT, HANDOVER_MESSAGE } from "@/lib/constants/mission";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";

type Stage = "handover" | "video" | "countdown";

const VIDEO_SRC = process.env.NEXT_PUBLIC_HANDOVER_VIDEO_URL || "/handover.mp4";

export function LaunchSequence({ operatorId }: { operatorId: string }) {
  const [stage, setStage] = React.useState<Stage>("handover");

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-16">
      <Aurora />
      <GridField />

      <AnimatePresence mode="wait">
        {stage === "handover" ? (
          <HandoverStage key="handover" onDone={() => setStage("video")} />
        ) : null}
        {stage === "video" ? (
          <VideoStage key="video" onDone={() => setStage("countdown")} />
        ) : null}
        {stage === "countdown" ? (
          <CountdownStage key="countdown" operatorId={operatorId} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ── 1. The message ─────────────────────────────────────────────────────── */

function HandoverStage({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = React.useState(0);
  const [typing, setTyping] = React.useState(false);

  React.useEffect(() => {
    const timers: number[] = [];
    HANDOVER_MESSAGE.lines.forEach((_, index) => {
      timers.push(window.setTimeout(() => setTyping(true), 500 + index * 1150));
      timers.push(
        window.setTimeout(() => {
          setTyping(false);
          setVisible(index + 1);
        }, 1150 + index * 1150),
      );
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const delivered = visible >= HANDOVER_MESSAGE.lines.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
      transition={{ duration: 0.7, ease: easing.outExpo }}
      className="relative w-full max-w-md"
    >
      <div className="panel sheen grain overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="relative">
            <div className="grid size-10 place-items-center rounded-full bg-linear-to-br from-ion-500/30 to-ion-600/10 text-[13px] font-semibold text-ion-400">
              RM
            </div>
            <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-ion-500 ring-2 ring-surface" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-hi">{HANDOVER_MESSAGE.handle}</p>
            <p className="text-[11.5px] text-lo">{HANDOVER_MESSAGE.from} · online</p>
          </div>
          <span className="ml-auto font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
            WhatsApp
          </span>
        </div>

        <div className="min-h-[15rem] space-y-2 px-5 py-6">
          {HANDOVER_MESSAGE.lines.slice(0, visible).map((line, index) => (
            <motion.div
              key={line}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: easing.outExpo }}
              className="flex"
            >
              <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-line-strong bg-white/[0.05] px-3.5 py-2.5 text-[15px] leading-snug text-hi">
                {line}
                <span className="ml-2 font-mono text-[10px] text-faint tabular-nums">
                  08:5{index + 2}
                </span>
              </div>
            </motion.div>
          ))}

          {typing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex">
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-white/[0.03] px-3.5 py-3">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      delay: dot * 0.16,
                      ease: "easeInOut",
                    }}
                    className="size-1.5 rounded-full bg-lo"
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {delivered ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easing.outExpo, delay: 0.35 }}
            className="mt-6 flex flex-col items-center gap-3"
          >
            <Button variant="primary" size="lg" onClick={onDone} className="w-full">
              He left a video
              <ArrowRight className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-1" />
            </Button>
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-faint uppercase">
              No further instructions
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── 2. The video ───────────────────────────────────────────────────────── */

function VideoStage({ onDone }: { onDone: () => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [muted, setMuted] = React.useState(true);

  function start() {
    const video = videoRef.current;
    if (!video) return;
    void video.play().then(
      () => setPlaying(true),
      () => setAvailable(false),
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
      transition={{ duration: 0.7, ease: easing.outExpo }}
      className="relative w-full max-w-3xl"
    >
      <div className="mb-5 text-center">
        <p className="font-mono text-[10.5px] tracking-[0.22em] text-ember-500 uppercase">
          {FIRST_SHIFT.codename} · Handover
        </p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.6vw,2.4rem)] leading-tight font-semibold tracking-[-0.035em] text-gradient">
          Rohit recorded this before he left.
        </h1>
      </div>

      <div className="panel sheen relative aspect-video overflow-hidden p-0">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          playsInline
          muted={muted}
          preload="metadata"
          onCanPlay={() => setAvailable((current) => current ?? true)}
          onError={() => setAvailable(false)}
          onEnded={onDone}
          className={cn(
            "size-full object-cover transition-opacity duration-500",
            playing ? "opacity-100" : "opacity-40",
          )}
        />

        {/* Nothing dropped into the slot yet — say so rather than stall. */}
        {available === false ? (
          <div className="absolute inset-0 grid place-items-center bg-obsidian/90 px-6 text-center">
            <div>
              <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-line-strong bg-surface">
                <Film className="size-5 text-lo" />
              </div>
              <p className="mt-5 text-[15px] text-hi">No briefing video loaded</p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-mid">
                Drop a file at <code className="text-ember-400">public/handover.mp4</code>,
                or point <code className="text-ember-400">NEXT_PUBLIC_HANDOVER_VIDEO_URL</code>{" "}
                at one. The shift starts either way.
              </p>
            </div>
          </div>
        ) : null}

        {available !== false && !playing ? (
          <button
            type="button"
            onClick={start}
            className="absolute inset-0 grid place-items-center bg-void/50 backdrop-blur-[2px] transition-colors hover:bg-void/35"
            aria-label="Play the handover video"
          >
            <span className="grid size-16 place-items-center rounded-full bg-ember-500 text-white shadow-[0_12px_40px_-12px_rgba(255,106,43,0.9)] transition-transform duration-300 ease-out-expo hover:scale-105">
              <Play className="size-6 translate-x-0.5" fill="currentColor" />
            </span>
          </button>
        ) : null}

        {playing ? (
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="glass absolute right-3 bottom-3 grid size-9 place-items-center rounded-full text-hi"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <Button variant={available === false ? "primary" : "secondary"} size="lg" onClick={onDone}>
          {available === false ? "Start the shift" : "Skip and start the shift"}
          <ArrowRight className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-1" />
        </Button>
        <p className="max-w-sm text-center text-[12px] leading-relaxed text-faint">
          The mission starts the moment this ends. Sixty minutes, one attempt, no
          pause.
        </p>
      </div>
    </motion.div>
  );
}

/* ── 3. The count-in ────────────────────────────────────────────────────── */

function CountdownStage({ operatorId }: { operatorId: string }) {
  const router = useRouter();
  const begin = useMissionStore((state) => state.begin);
  const seedOpeners = useChatStore((state) => state.seedOpeners);
  const [count, setCount] = React.useState(5);
  const launched = React.useRef(false);

  React.useEffect(() => {
    if (count > 0) {
      const timer = window.setTimeout(() => setCount((value) => value - 1), 1000);
      return () => window.clearTimeout(timer);
    }

    if (launched.current) return;
    launched.current = true;
    begin(operatorId);
    seedOpeners();
    router.replace("/mission");
    return;
  }, [count, begin, seedOpeners, operatorId, router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col items-center"
    >
      <p className="font-mono text-[11px] tracking-[0.28em] text-ember-500 uppercase">
        Hub opening
      </p>

      <div className="relative mt-10 grid size-56 place-items-center">
        <motion.span
          key={`ring-${count}`}
          initial={{ scale: 0.6, opacity: 0.7 }}
          animate={{ scale: 1.35, opacity: 0 }}
          transition={{ duration: 1, ease: easing.outExpo }}
          className="absolute inset-0 rounded-full border border-ember-500/50"
        />
        <span className="absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(255,106,43,0.22),transparent_70%)] blur-2xl" />

        <AnimatePresence mode="wait">
          <motion.span
            key={count}
            initial={{ scale: 1.6, opacity: 0, filter: "blur(14px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            exit={{ scale: 0.7, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.5, ease: easing.outExpo }}
            data-readout
            className="text-[7rem] leading-none font-semibold tracking-[-0.06em] text-hi tabular-nums"
          >
            {count > 0 ? count : "0"}
          </motion.span>
        </AnimatePresence>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-10 max-w-xs text-center text-[14px] leading-relaxed text-mid"
      >
        {FIRST_SHIFT.location}. Doors open on zero.
      </motion.p>
    </motion.div>
  );
}
