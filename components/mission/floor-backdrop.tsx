import Image from "next/image";

/**
 * The store you are standing in.
 *
 * The control room is three columns of dense text on a fifteen-minute clock,
 * so the photograph behind them has one job: put the operator somewhere real
 * and then get out of the way. It is held well back — low opacity over a black
 * base, a vignette pulling the edges down — and the panels on top are
 * translucent with a heavy blur, which replaces the picture under them with a
 * local average rather than leaving bright pixels behind small text.
 *
 * Atmosphere, not decoration on top of work.
 */
export function MissionFloorBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-card">
      <Image
        src="/mission-floor.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center opacity-[0.5]"
      />
      {/* Sinks the top and bottom so the lane switcher and the panel edges
          read as foreground rather than as cards floating on a picture. */}
      <div className="absolute inset-0 bg-gradient-to-b from-void/80 via-void/35 to-void/85" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_30%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
