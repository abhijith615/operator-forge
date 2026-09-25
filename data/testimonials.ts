/**
 * Words from people who have actually run the challenge.
 *
 * TODO: add real testimonials here after the first cohort (12–18 Oct 2026).
 * Ask each person for permission in writing before publishing their words.
 * Nothing invented, ever: while this array is empty the section does not
 * render at all, which is the correct thing for a page that has no proof yet.
 *
 * Shape, one entry per person:
 *   {
 *     quote: "What they said, in their words, lightly trimmed for length.",
 *     name: "First name only",
 *     context: "Final-year B.Com, Kochi",
 *   }
 */

export interface Testimonial {
  quote: string;
  /** First name only — never a full name without explicit permission. */
  name: string;
  /** Who they are, e.g. "Final-year B.Com, Kochi". */
  context: string;
}

export const TESTIMONIALS: Testimonial[] = [];
