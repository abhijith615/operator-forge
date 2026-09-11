import { resolveVideo, type HandoverVideo } from "@/lib/mission/video";

/**
 * The challenge's explainer videos.
 *
 * Each resolves the same way the mission's briefing video does: a setting
 * takes a YouTube link, any direct video URL, or a local path. The default is
 * the local file in `public/videos/`, which works in development.
 *
 * Those files are gitignored along with every other `*.mp4` — together they
 * are close to 100MB, which does not belong in git history — so a deployment
 * has no copy of them. Until a hosted URL is set, the player on a deployment
 * says the video is unavailable and the screen carries on without it. Nothing
 * in the challenge waits on a video.
 *
 * `process.env.NEXT_PUBLIC_*` is referenced literally so Next can inline it.
 */

export interface ExplainerVideoSpec {
  title: string;
  source: HandoverVideo;
}

export const CHALLENGE_VIDEOS = {
  dayOneIntro: {
    title: "Dark Store Operations — introduction",
    source: resolveVideo(process.env.NEXT_PUBLIC_DAY1_INTRO_VIDEO_URL, "/videos/day-1-intro.mp4"),
  },
  dayTwoIntro: {
    title: "Day 2 — introduction",
    source: resolveVideo(process.env.NEXT_PUBLIC_DAY2_INTRO_VIDEO_URL, "/videos/day-2-intro.mp4"),
  },
  dayTwoInspection: {
    title: "Day 2 — earbud inspection",
    source: resolveVideo(
      process.env.NEXT_PUBLIC_DAY2_INSPECTION_VIDEO_URL,
      "/videos/day-2-earbud-inspection.mp4",
    ),
  },
} satisfies Record<string, ExplainerVideoSpec>;
