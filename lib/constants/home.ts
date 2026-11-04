import { OFFER, mailtoUrl, whatsappUrl } from "./offer";

/**
 * The homepage, for employers first.
 *
 * Every call to action that asks for a conversation goes to WhatsApp with the
 * message already written, so an enquiry arrives saying what it is about. Email
 * is offered beside it for anyone who would rather write.
 */

/**
 * The hero video. Put a YouTube id here (the part after `youtu.be/`) and the
 * hero shows it; leave it null and the hero keeps the space with a placeholder.
 */
export const HOME_VIDEO: { id: string | null; title: string } = {
  id: "XcuyJDdxgpg",
  title: "See an Operator Forge simulation in action",
};

const DEMO_MESSAGE =
  "Hi Operator Forge, I'd like to book a demo of simulation-based hiring. Company: ___ · Role(s) we're hiring for: ___";
const PILOT_MESSAGE =
  "Hi Operator Forge, I'd like to start a hiring pilot. Company: ___ · Role: ___ · Hires per month: ___";
const PARTNER_MESSAGE =
  "Hi Operator Forge, I'm writing from a college / institution and would like to partner on simulation-based assessments. Institution: ___";
const CONTACT_MESSAGE = "Hi Operator Forge, I have a question.";

export const DEMO_URL = whatsappUrl(DEMO_MESSAGE);
export const PILOT_URL = whatsappUrl(PILOT_MESSAGE);
export const PARTNER_URL = whatsappUrl(PARTNER_MESSAGE);
export const CONTACT_URL = whatsappUrl(CONTACT_MESSAGE);
export const DEMO_EMAIL_URL = mailtoUrl("Operator Forge — demo request", "Company:\nRole(s) we're hiring for:\nHires per month:\n");
export const CONTACT_EMAIL = OFFER.email;

/** The roles named under the hero. */
export const HOME_ROLES = [
  "Operations",
  "Business Operations",
  "Founder's Office",
  "Strategy",
  "Customer Success",
  "Other non-technical roles",
] as const;
