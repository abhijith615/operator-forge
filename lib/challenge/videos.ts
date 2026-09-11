import { resolveVideo, type HandoverVideo } from "@/lib/mission/video";

/**
 * The challenge's explainer videos.
 *
 * Hosted in the public `challenge-videos` bucket in Supabase Storage. The
 * files are too large for git — together close to 100MB, and every `*.mp4`
 * is gitignored — so the bucket is what makes them play on a deployment, and
 * because the URL is built from `NEXT_PUBLIC_SUPABASE_URL`, which a
 * deployment already has, it works with nothing new configured.
 *
 * Precedence, per video:
 *   1. its own setting, if set — a YouTube link, any direct URL, or a path;
 *   2. the Supabase bucket, when Supabase is configured;
 *   3. the local copy in `public/videos/`, for Simulator Mode.
 *
 * If none of those loads, the player says the video is unavailable and the
 * screen carries on without it. Nothing in the challenge waits on a video.
 *
 * `process.env.NEXT_PUBLIC_*` is referenced literally so Next can inline it.
 */

export const VIDEO_BUCKET = "challenge-videos";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");

function defaultFor(file: string): string {
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
    source: resolveVideo(process.env.NEXT_PUBLIC_DAY1_INTRO_VIDEO_URL, defaultFor("day-1-intro.mp4")),
  },
  dayTwoIntro: {
    title: "Day 2 — introduction",
    source: resolveVideo(process.env.NEXT_PUBLIC_DAY2_INTRO_VIDEO_URL, defaultFor("day-2-intro.mp4")),
  },
  dayTwoInspection: {
    title: "Day 2 — earbud inspection",
    source: resolveVideo(
      process.env.NEXT_PUBLIC_DAY2_INSPECTION_VIDEO_URL,
      defaultFor("day-2-earbud-inspection.mp4"),
    ),
  },
} satisfies Record<string, ExplainerVideoSpec>;
