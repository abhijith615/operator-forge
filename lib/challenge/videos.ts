import { resolveVideo, type HandoverVideo } from "@/lib/mission/video";

/**
 * The challenge's explainer videos.
 *
 * The two intro videos are on YouTube, which streams them adaptively and puts
 * no load on the project's own bandwidth. The short Day 2 inspection clip is
 * in the public `challenge-videos` bucket in Supabase Storage; its URL is built
 * from `NEXT_PUBLIC_SUPABASE_URL`, which a deployment already has, so it
 * plays with nothing new configured.
 *
 * Every video can be overridden by its own setting — a YouTube link, any
 * direct URL, or a path. If a video cannot load, the player says so and the
 * screen carries on without it. Nothing in the challenge waits on a video.
 *
 * `process.env.NEXT_PUBLIC_*` is referenced literally so Next can inline it.
 */

export const VIDEO_BUCKET = "challenge-videos";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");

/** Supabase bucket when configured; the local copy in `public/videos/` otherwise. */
function hosted(file: string): string {
  return SUPABASE_URL
    ? `${SUPABASE_URL}/storage/v1/object/public/${VIDEO_BUCKET}/${file}`
    : `/videos/${file}`;
}

export interface ExplainerVideoSpec {
  title: string;
  source: HandoverVideo;
}

export const CHALLENGE_VIDEOS = {
  dayOneIntro: {
    title: "Dark Store Operations — introduction",
    source: resolveVideo(process.env.NEXT_PUBLIC_DAY1_INTRO_VIDEO_URL, "https://youtu.be/2mak09cteGQ"),
  },
  dayTwoIntro: {
    title: "Day 2 — introduction",
    source: resolveVideo(process.env.NEXT_PUBLIC_DAY2_INTRO_VIDEO_URL, "https://youtu.be/3Pqbx8979Lw"),
  },
  dayTwoInspection: {
    title: "Day 2 — earbud inspection",
    source: resolveVideo(
      process.env.NEXT_PUBLIC_DAY2_INSPECTION_VIDEO_URL,
      hosted("day-2-earbud-inspection.mp4"),
    ),
  },
} satisfies Record<string, ExplainerVideoSpec>;
