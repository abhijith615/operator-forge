/**
 * The paid 7-Day Operations Leader Challenge, as sold on /7-day-challenge.
 *
 * Everything a marketing change touches lives here — dates, price, the payment
 * link, the contact number and the AMA speaker — so the page never has to be
 * edited to change an offer. Nothing on the page should state a fact that is
 * not in this file or in the product itself.
 */

export const OFFER_ROUTE = "/7-day-challenge";

export const OFFER = {
  name: "7-Day Operations Leader Challenge",
  /**
   * Stored with every registration, so one table can hold many cohorts. A
   * label, not a date: this cohort was moved from 28 Sept to 12 Oct and kept
   * its id so the registrations already taken stay with it.
   */
  cohort: "2026-09-28",
  /** Monday 12 October 2026, midnight in India. */
  startsAt: "2026-10-12T00:00:00+05:30",
  /** Sunday 18 October 2026, end of day in India. */
  endsAt: "2026-10-18T23:59:59+05:30",
  dateLabel: "12 – 18 Oct 2026",
  /** When the simulations open to participants. The database enforces it. */
  liveLabel: "12 Oct 2026",
  price: 499,
  listPrice: 1499,
  currency: "INR",
  paymentUrl: "https://rzp.io/rzp/zA3rZnNR",
  /** Deliberately no number: the page never states a seat count. */
  seatsNote: "Limited seats available",
  refundNote: "Complete refund if you have a genuine case.",
  whatsapp: {
    /** Country code and number, digits only, as wa.me expects. */
    number: "918089508891",
    display: "+91 80895 08891",
    message:
      "Hi Operator Forge, I have a question about the 7-Day Operations Leader Challenge (12 – 18 Oct 2026).",
  },
  speaker: {
    role: "State Head (Kerala), Blinkit",
    experience: "A decade+ in digital commerce operations",
  },
} as const;

export function whatsappUrl(message: string = OFFER.whatsapp.message): string {
  return `https://wa.me/${OFFER.whatsapp.number}?text=${encodeURIComponent(message)}`;
}

export function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

const DAY_MS = 86_400_000;

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Kolkata",
});

/** "Mon, 12 Oct" for the nth day of the cohort, counted from zero. */
export function cohortDate(index: number): string {
  return DATE_FORMAT.format(new Date(Date.parse(OFFER.startsAt) + index * DAY_MS));
}

export interface OfferDay {
  day: number;
  title: string;
  body: string;
  date: string;
}

const DAYS: Omit<OfferDay, "date">[] = [
  {
    day: 1,
    title: "Run a Live Dark Store",
    body: "Manage orders, riders and real-time disruptions in a simulated Q-Com store.",
  },
  {
    day: 2,
    title: "Investigate Real Inventory Losses",
    body: "Find what's missing, analyse the data and recommend solutions.",
  },
  {
    day: 3,
    title: "Build and Lead Your Team",
    body: "Assign roles, handle conflicts and drive performance.",
  },
  {
    day: 4,
    title: "Fix the Operational Bottleneck",
    body: "Identify what's slowing the store down, and unblock it.",
  },
  {
    day: 5,
    title: "Protect the Customer Promise",
    body: "Handle customer issues and ensure on-time, error-free deliveries.",
  },
  {
    day: 6,
    title: "Discover Your Operator Profile",
    body: "Get your personalised Operator Genome and your key strengths.",
  },
  {
    day: 7,
    title: "Live AMA With an Operations Expert",
    body: "Ask. Learn. Get real advice from an industry operator.",
  },
];

export const OFFER_DAYS: OfferDay[] = DAYS.map((entry, index) => ({ ...entry, date: cohortDate(index) }));
