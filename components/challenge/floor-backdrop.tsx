import Image from "next/image";

/**
 * The floor you are standing on.
 *
 * The control room is three panels of dense text on a fifteen-minute clock, so
 * the photograph behind them has one job: place the operator somewhere real,
 * and then get out of the way. It is held at low opacity over a black base and
 * sunk further behind a vertical scrim, which bounds how bright any pixel of
 * it can get — the panels sit on top at 85% and the worst case that reaches
 * the text is roughly the gap between `surface` and `elevated`, two greys the
 * design already puts side by side. Atmosphere, not decoration on top of work.
 */
export function FloorBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Image
        src="/store-floor.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center opacity-[0.78]"
      />
      {/* Sinks the clock bar and the bottom edge so the panels read as the
          foreground rather than as cards floating on a picture. */}
      <div className="absolute inset-0 bg-gradient-to-b from-void/70 via-void/5 to-void/70" />
      {/* A vignette rather than a flat wash. The middle of the frame — which
          is where the panels leave a margin of floor visible — stays bright,
          and the edges fall away so nothing competes with the clock or the
          lane switcher. Flat scrims dim the one part of the photograph that
          is actually doing the work of putting somebody in a building. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
