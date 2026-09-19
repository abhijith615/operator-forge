import { NextResponse, type NextRequest } from "next/server";

import { getOperator } from "@/lib/auth/session";
import { hasChallengeAccess } from "@/lib/challenge/access";
import { CERTIFICATE_ROUTE, issueCertificate, verificationPath } from "@/lib/challenge/certificate";
import { certificateFileName, renderCertificateImage } from "@/lib/challenge/certificate-image";
import { LOGIN_ROUTE } from "@/lib/constants/routes";

/**
 * The signed-in operator's certificate as a PNG download. Drawn on request
 * from the issued certificate, so the name, dates and code always match what
 * the verification page says. Anyone not yet eligible is sent to the
 * certificate page, which shows their progress.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const operator = await getOperator();
  if (!operator) {
    return NextResponse.redirect(new URL(`${LOGIN_ROUTE}?next=${encodeURIComponent(CERTIFICATE_ROUTE)}`, request.url));
  }
  if (!(await hasChallengeAccess())) return NextResponse.redirect(new URL(CERTIFICATE_ROUTE, request.url));

  const certificate = await issueCertificate();
  if (!certificate) return NextResponse.redirect(new URL(CERTIFICATE_ROUTE, request.url));

  const image = await renderCertificateImage(
    certificate,
    `${request.nextUrl.origin}${verificationPath(certificate.code)}`,
  );
  const headers = new Headers(image.headers);
  headers.set("Content-Disposition", `attachment; filename="${certificateFileName(certificate.fullName)}"`);
  headers.set("Cache-Control", "private, no-store");
  return new Response(image.body, { status: 200, headers });
}
