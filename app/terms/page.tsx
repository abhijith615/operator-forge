import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { PRIVACY_ROUTE, TERMS_ROUTE } from "@/lib/constants/legal";
import { OFFER, OFFER_ROUTE, inr, whatsappUrl } from "@/lib/constants/offer";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms for using Operator Forge and joining the 7-Day Operations Leader Challenge.",
  alternates: { canonical: TERMS_ROUTE },
};

export const viewport: Viewport = { themeColor: "#FAF7F0", colorScheme: "light" };

const SECTIONS: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreeing to these terms",
    body: (
      <p>
        These terms apply to the Operator Forge website, simulations and programmes (together, &ldquo;the
        service&rdquo;). By registering, paying, signing in or using the service, you agree to them and to our{" "}
        <Link href={PRIVACY_ROUTE}>Privacy Policy</Link>. If you do not agree, please do not use the service.
      </p>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility and your account",
    body: (
      <ul>
        <li>You must be 18 or over to use the service.</li>
        <li>Give accurate details when you register and sign in, and keep them up to date.</li>
        <li>An account is for one person. Do not share it, and keep access to your email and Google account secure.</li>
        <li>You are responsible for what happens under your account.</li>
      </ul>
    ),
  },
  {
    id: "challenge",
    title: `The ${OFFER.name}`,
    body: (
      <>
        <ul>
          <li>
            <strong>Dates.</strong> The current cohort runs {OFFER.dateLabel}. The simulations open to participants on{" "}
            {OFFER.liveLabel}.
          </li>
          <li>
            <strong>What is included.</strong> As described on the <Link href={OFFER_ROUTE}>challenge page</Link>: live
            operations simulations on Days 1 to 5, an operator profile on Day 6, a live AMA on Day 7 and a certificate of
            completion for participants who complete the challenge.
          </li>
          <li>
            <strong>Access.</strong> Access is personal and tied to the email address you registered with. Sign in with
            that same email; access opens once your payment is confirmed and the cohort has started.
          </li>
          <li>
            <strong>Each day is played once.</strong> Your first completed attempt is the one that is scored and
            recorded.
          </li>
          <li>
            <strong>The live AMA.</strong> The session is delivered online with the speaker described on the challenge
            page. If the speaker or time must change for reasons outside our control, we will tell you and arrange a
            comparable session or a new time.
          </li>
        </ul>
        <p>
          We may improve or adjust the content of a simulation, provided the programme remains substantially as
          described.
        </p>
      </>
    ),
  },
  {
    id: "payments",
    title: "Price and payment",
    body: (
      <ul>
        <li>
          The price is the amount shown on the challenge page and at checkout — currently {inr(OFFER.price)} (reduced
          from {inr(OFFER.listPrice)}) for all seven days.
        </li>
        <li>
          Payments are processed securely by Razorpay under its own terms. We do not see or store your card, UPI or
          bank details.
        </li>
        <li>
          Your seat is confirmed when your payment is confirmed to us. Please pay with the same email you registered
          with, so we can match the payment to you.
        </li>
      </ul>
    ),
  },
  {
    id: "refunds",
    title: "Refunds and cancellation",
    body: (
      <>
        <p>
          <strong>{OFFER.refundNote}</strong> To ask for one,{" "}
          <a href={whatsappUrl("Hi Operator Forge, I would like to request a refund for the 7-Day Challenge.")}>
            message us on WhatsApp at {OFFER.whatsapp.display}
          </a>{" "}
          with your registered email and Razorpay payment ID, and tell us briefly what happened. We review every
          request individually.
        </p>
        <ul>
          <li>Approved refunds are made to the original payment method through Razorpay. How long they take to reach you depends on your bank or payment provider.</li>
          <li>Access to the programme ends once a refund is made.</li>
          <li>If we cancel a cohort, you will receive a full refund or, if you prefer, a place in a later cohort.</li>
        </ul>
      </>
    ),
  },
  {
    id: "assessments",
    title: "Scores, certificates and outcomes",
    body: (
      <p>
        Participants who complete the challenge receive a certificate of completion from Operator Forge, which
        confirms that they took part in and completed the programme. Scorecards, leaderboards and operator profiles
        are a practice assessment based on simulated situations. Neither the certificate nor the assessment is an
        employment certification, a professional qualification or a guarantee of a job, internship, interview or
        salary. Features we describe as &ldquo;coming soon&rdquo; — such as mentor sessions or sharing
        profiles with hiring partners — are not yet available and are not part of any purchase unless we say so
        explicitly.
      </p>
    ),
  },
  {
    id: "ai",
    title: "AI-generated content",
    body: (
      <p>
        Some characters and the assistant inside the simulations reply using artificial intelligence. Their replies
        are part of a fictional exercise, may be inaccurate, and are not professional, legal, financial or career
        advice. Please do not share sensitive personal information with them.
      </p>
    ),
  },
  {
    id: "acceptable-use",
    title: "Using the service fairly",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>share, sell or transfer your access, or let anyone else play under your account;</li>
          <li>use scripts, bots or other automation, or try to manipulate scores or the leaderboard;</li>
          <li>copy, record, republish or resell the simulations, scenarios or other content;</li>
          <li>interfere with the service, probe it for vulnerabilities or try to access other people&rsquo;s data;</li>
          <li>post or send anything unlawful, abusive or harmful, including through the in-simulation chat; or</li>
          <li>disrupt the live AMA or harass the speaker or other participants.</li>
        </ul>
        <p>
          We may suspend or end access for anyone who breaks these rules, without a refund where the breach is
          serious.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Content and ownership",
    body: (
      <p>
        The service — its simulations, scenarios, text, design, software and branding — belongs to Operator Forge or
        its licensors. You get a personal, non-transferable right to use it for the programme you joined. Your
        decisions and results remain about you; you allow us to use them to run the service, produce your assessment
        and show the leaderboard as described in our Privacy Policy.
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "Other companies",
    body: (
      <p>
        The simulations are modelled on the kind of work done in quick commerce. Operator Forge is independent and is
        not affiliated with, or endorsed by, Zepto, Swiggy Instamart, Blinkit or any other company named on the
        website; their names are used only to describe that kind of work. Speakers share their own views, not those
        of their employers. Links to other websites and services are provided for convenience, and those services
        have their own terms.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability",
    body: (
      <p>
        We work to keep the service running, but it may occasionally be unavailable for maintenance or for reasons
        outside our control. If a problem stops you completing a day during the cohort, contact us and we will help.
        The service needs a modern browser and a stable internet connection, which are your responsibility.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Our responsibility to you",
    body: (
      <p>
        We provide the service with reasonable care and skill. To the extent the law allows, we are not liable for
        indirect or consequential loss, or for decisions you make based on the simulations, and our total liability
        to you for any claim about a programme is limited to the amount you paid for it. Nothing in these terms
        limits any right you have under the Consumer Protection Act, 2019 or other law that cannot be excluded.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes and ending",
    body: (
      <p>
        We may update these terms; the date at the top shows the latest version, and changes do not reduce what you
        already paid for. You can stop using the service at any time and ask us to delete your account. We may close
        accounts that break these terms.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and disputes",
    body: (
      <p>
        These terms are governed by the laws of India. If you have a complaint, please contact us first — most
        things can be sorted out quickly. Any dispute that cannot be resolved that way will be handled by the
        competent courts in India.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      current={TERMS_ROUTE}
      intro={
        <p>
          The rules for using Operator Forge and joining the {OFFER.name}, written to be read. Please read them before
          you register or pay.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
