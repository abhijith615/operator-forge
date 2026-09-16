import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { PRIVACY_ROUTE, TERMS_ROUTE } from "@/lib/constants/legal";
import { OFFER, OFFER_ROUTE, whatsappUrl } from "@/lib/constants/offer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Operator Forge collects, why, who processes it, and the choices you have.",
  alternates: { canonical: PRIVACY_ROUTE },
};

export const viewport: Viewport = { themeColor: "#FAF7F0", colorScheme: "light" };

/**
 * Written to describe what the product actually does — every item below maps
 * to a table, a cookie or a service in this codebase. Change the code, change
 * this page (and LEGAL_UPDATED).
 */
const SECTIONS: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <p>
        Operator Forge (&ldquo;we&rdquo;, &ldquo;us&rdquo;) runs online operations simulations, including the{" "}
        <Link href={OFFER_ROUTE}>{OFFER.name}</Link>. We decide why and how the personal data described here is used,
        which makes us its data fiduciary under India&rsquo;s Digital Personal Data Protection Act, 2023.
      </p>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <ul>
          <li>
            <strong>Registration details</strong> — the name, phone number and email you enter on the challenge
            registration form, and, if you arrived from an ad, the campaign tags in the link (such as{" "}
            <code>utm_source</code> or <code>fbclid</code>).
          </li>
          <li>
            <strong>Account details</strong> — your email address and, if you sign in with Google, the name and
            profile picture Google shares with us. During onboarding we also ask for your name and WhatsApp number.
          </li>
          <li>
            <strong>Payment details</strong> — when you pay, Razorpay tells us the payment ID, amount, status and the
            email and phone number used. Card, UPI and bank details are handled by Razorpay; we never see or store
            them.
          </li>
          <li>
            <strong>What you do in the simulations</strong> — your decisions, the time taken, scores, scorecards and
            how you moved through each exercise (for example which screens you opened and which terms you looked up).
            This is what your assessment is built from.
          </li>
          <li>
            <strong>Messages to in-simulation characters and the assistant</strong> — what you type to them, so they
            can reply.
          </li>
          <li>
            <strong>Interest you register</strong> — for example joining a waitlist for a feature that is not built
            yet.
          </li>
          <li>
            <strong>Technical data</strong> — sign-in cookies, information your browser sends (such as device type and
            IP address) and, through the Meta Pixel, which of our pages you visited and whether you started
            registration or contacted us.
          </li>
        </ul>
        <p>We do not ask for, and ask you not to share, government ID numbers or financial account details.</p>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    body: (
      <ul>
        <li>To register you for a cohort, take your payment, confirm your seat and give you access with your email.</li>
        <li>To run the simulations, save your progress and produce your scorecards and operator profile.</li>
        <li>
          To show a cohort leaderboard. It shows only your first name, the initial of your last name, your score and
          your result — never your email, phone number or decisions.
        </li>
        <li>To contact you about the programme you signed up for, including by WhatsApp, email or phone.</li>
        <li>To handle refunds, questions and complaints.</li>
        <li>To measure which ads bring people to us, and to show our ads to relevant audiences on Meta.</li>
        <li>To keep the service secure, prevent misuse and meet legal, tax and accounting obligations.</li>
      </ul>
    ),
  },
  {
    id: "consent",
    title: "Your consent",
    body: (
      <p>
        We process your personal data with your consent, which you give when you register, sign in or use the
        simulations, and for the legitimate uses the law allows — such as completing a payment you asked for or
        meeting a legal requirement. You can withdraw consent at any time by contacting us; that stops future
        processing but does not undo processing already done. Without some of this data — your email, for example —
        we cannot give you access to the challenge.
      </p>
    ),
  },
  {
    id: "who-processes-it",
    title: "Who processes it for us",
    body: (
      <>
        <p>We do not sell your personal data. We share it only with the services that run Operator Forge:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — our database and sign-in provider, where accounts, registrations, payments
            records and simulation results are stored.
          </li>
          <li>
            <strong>Google</strong> — if you choose &ldquo;Continue with Google&rdquo; to sign in.
          </li>
          <li>
            <strong>Razorpay</strong> — to take payments and process refunds.
          </li>
          <li>
            <strong>Meta (Facebook and Instagram)</strong> — the Meta Pixel on our website, for ad measurement and
            audiences. Meta handles that data under its own privacy policy.
          </li>
          <li>
            <strong>OpenAI</strong> — to generate replies from in-simulation characters and the assistant, using the
            messages you send and the state of your simulation.
          </li>
          <li>
            <strong>Our hosting provider</strong> — which serves the website and keeps routine server logs.
          </li>
        </ul>
        <p>
          We may also disclose data where the law requires it, or to protect our users or the service. Some of these
          providers process data outside India; we use them only as the law permits.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar technology",
    body: (
      <ul>
        <li>
          <strong>Essential</strong> — cookies that keep you signed in. The service does not work without them.
        </li>
        <li>
          <strong>Local storage</strong> — your browser keeps some simulation progress so that a refresh does not lose
          your place.
        </li>
        <li>
          <strong>Advertising</strong> — the Meta Pixel sets cookies to measure page visits and registrations from our
          ads. You can limit this through your browser settings or your Meta ad preferences.
        </li>
      </ul>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <p>
        We keep account and simulation data while your account is active, and registration and payment records for as
        long as we need them for the programme and for as long as tax and accounting law requires. When data is no
        longer needed, or you ask us to erase it and we are not required to keep it, we delete it.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>Under the Digital Personal Data Protection Act, 2023, you can ask us to:</p>
        <ul>
          <li>tell you what personal data we hold about you and how we use it;</li>
          <li>correct, complete or update it;</li>
          <li>erase it, where we are not required to keep it;</li>
          <li>withdraw your consent;</li>
          <li>address a grievance about how we handled your data; and</li>
          <li>record a person to act for you if you die or are unable to.</li>
        </ul>
        <p>
          To do any of these, <a href={whatsappUrl("Hi Operator Forge, I have a privacy request about my data.")}>message
          us on WhatsApp at {OFFER.whatsapp.display}</a> from the number or with the email you used with us, so we can
          confirm it is you. If you are not satisfied with our response, you may complain to the Data Protection Board
          of India.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        Data is encrypted in transit, and access is restricted: each person can read only their own records, and only
        named administrators can see registrations and payments. No system is perfectly secure, but if a breach
        affects your personal data we will tell you and the authorities as the law requires.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        Operator Forge is intended for people aged 18 and over. We do not knowingly collect data from children. If you
        believe a child has given us personal data, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        When we change this policy we update the date at the top of this page, and for significant changes we will
        tell registered participants directly. Please also read our <Link href={TERMS_ROUTE}>Terms &amp; Conditions</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      current={PRIVACY_ROUTE}
      intro={
        <p>
          This policy explains what personal data Operator Forge collects when you visit our website, register for a
          programme, pay, or use the simulations — why we collect it, who processes it for us, and the choices you
          have.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
