import { KeyRound } from "lucide-react";

/**
 * Chat is the one Phase 2 surface that cannot be faked. Without a model key the
 * colleagues have nothing to say, and inventing replies for them would make the
 * whole premise dishonest — so it says exactly what is missing.
 */
export function ChatUnavailable({ what }: { what: string }) {
  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="mx-auto grid size-11 place-items-center rounded-full border border-warn-500/25 bg-warn-500/[0.08]">
        <KeyRound className="size-4 text-warn-500" />
      </div>
      <p className="mt-5 text-[15px] text-hi">{what} is not connected</p>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-mid">
        This server has no <code className="text-ember-400">OPENAI_API_KEY</code>.
        Add it to <code className="text-ember-400">.env.local</code> and{" "}
        <span className="text-hi">restart the server</span> — the environment is
        read once at boot, so a running process will not pick up a new key.
      </p>
      <p className="mt-3 text-[12.5px] leading-relaxed text-lo">
        Already added it? Open <code className="text-mid">/api/chat</code> to see
        what this process actually has. Everything else on the floor keeps
        running without it.
      </p>
    </div>
  );
}
