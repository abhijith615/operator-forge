/**
 * The briefing video source.
 *
 * Defaults to a hosted YouTube clip rather than a file in `public/`, because a
 * 60MB asset does not belong in the repo and a deployment would otherwise show
 * the empty state. `NEXT_PUBLIC_HANDOVER_VIDEO_URL` overrides it — set it to a
 * YouTube link, any direct video URL, or a local path like `/handover.mp4`.
 */
export const DEFAULT_HANDOVER_VIDEO = "https://youtu.be/2mak09cteGQ";

export type HandoverVideo =
  | { kind: "youtube"; id: string }
  | { kind: "file"; src: string }
  | { kind: "none" };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Handles youtu.be, /watch?v=, /embed/ and /shorts/ forms. */
function youtubeIdFrom(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return YOUTUBE_ID.test(id) ? id : null;
  }

  if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtube-nocookie.com") {
    return null;
  }

  const fromQuery = url.searchParams.get("v");
  if (fromQuery && YOUTUBE_ID.test(fromQuery)) return fromQuery;

  const match = url.pathname.match(/^\/(?:embed|shorts|v)\/([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

export function resolveHandoverVideo(raw?: string): HandoverVideo {
  const source = (raw ?? "").trim() || DEFAULT_HANDOVER_VIDEO;
  if (!source) return { kind: "none" };

  const youtubeId = youtubeIdFrom(source);
  if (youtubeId) return { kind: "youtube", id: youtubeId };

  return { kind: "file", src: source };
}
