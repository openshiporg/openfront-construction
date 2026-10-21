import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PublicShell } from "../components/PublicShell";
import { getPublicConstructionService, getPublicConstructionSite } from "../data";
import type { PublicConstructionSite } from "../types";
import { CUSTOMER_REQUEST_PAGE_SIZE, getCustomerRequest, getCustomerRequestCount, getCustomerRequests, getCustomerUser, type CustomerRequest } from "./data";
import { CustomerAuthForm, ProfileForm, RequestDecision, RequestForm, ResetPasswordForm, ResetRequestForm } from "./AccountForms";
import { customerSignOut } from "./actions";
import { customerContinuation } from "./continuation";
import { formatUsdMinor } from "@/features/lib/money";

const STATUS_LABELS: Record<string, string> = {
  requested: "Awaiting quote",
  quoted: "Quote ready",
  payment_pending: "Accepted",
  cancelled: "Cancelled",
};

/** An issued quote always has a positive amount and terms; the model default is not a quote. */
function hasIssuedQuote(request: CustomerRequest) {
  return Boolean(request.acceptedSnapshot) || (request.quoteMinor !== "0" && Boolean(request.quoteTerms));
}

function isQuoteExpired(request: CustomerRequest, now = Date.now()) {
  return request.status === "quoted" && (!request.expiresAt || new Date(request.expiresAt).getTime() <= now);
}

function statusLabel(request: CustomerRequest) {
  return isQuoteExpired(request) ? "Quote expired" : STATUS_LABELS[request.status] ?? request.status.replaceAll("_", " ");
}

function SignInChoices({ site, service, from }: { site: PublicConstructionSite | null; service?: string; from?: string }) {
  // New accounts are offered only on a published website; existing customers can always sign in.
  return <div className="grid min-w-0 gap-6 md:grid-cols-2">
    <CustomerAuthForm service={service} from={from} />
    {site && <CustomerAuthForm signup service={service} from={from} />}
  </div>;
}

export async function AccountPage({ searchParams }: { searchParams: Promise<{ service?: string; from?: string; page?: string }> }) {
  const [site, user, params] = await Promise.all([getPublicConstructionSite(), getCustomerUser(), searchParams]);
  const from = customerContinuation(params.from, "");
  if (user && from) redirect(from);
  const service = params.service && site ? await getPublicConstructionService(params.service) : null;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const [requests, total]: [CustomerRequest[], number] = user
    ? await Promise.all([getCustomerRequests(false, { skip: (page - 1) * CUSTOMER_REQUEST_PAGE_SIZE, take: CUSTOMER_REQUEST_PAGE_SIZE }), getCustomerRequestCount()])
    : [[], 0];
  const pages = Math.max(1, Math.ceil(total / CUSTOMER_REQUEST_PAGE_SIZE));
  return <PublicShell site={site} account><main className="sf-main"><section className="sf-section"><div className="sf-wrap grid min-w-0 gap-8 py-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-semibold">Account</h1>
      {user && <form action={customerSignOut}><button className="min-h-11 min-w-11 rounded-md border px-4">Sign out</button></form>}
    </div>
    {service && <section className="grid gap-4 rounded-lg border p-5"><h2 className="text-2xl font-semibold">{service.title}</h2><p>{service.summary}</p>
      {user && (site?.acceptingInquiries ? <RequestForm serviceSlug={service.slug} /> : <p>New quote requests are paused. Contact the contractor directly.</p>)}
    </section>}
    {!user ? <SignInChoices site={site} service={service?.slug} from={from} /> : <>
      <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone ?? "" }} />
      <section className="grid min-w-0 gap-4">
        <h2 className="text-xl font-semibold">Requests</h2>
        {requests.length === 0 ? <p>No requests yet</p> : <div className="grid gap-4">{requests.map(request => <Link key={request.id} href={`/account/requests/${request.id}`} className="grid min-h-11 min-w-0 gap-2 rounded-lg border p-5">
          <span className="flex flex-wrap items-center gap-2 font-semibold"><span aria-hidden="true" className="size-2 rounded-full bg-current" />{request.serviceTitle}<span className="text-sm font-normal">{statusLabel(request)}</span></span>
          <span>{request.reference}</span>{hasIssuedQuote(request) && <span>{formatUsdMinor(request.acceptedSnapshot ? String(request.acceptedSnapshot.totalMinor) : request.quoteMinor)}</span>}
        </Link>)}</div>}
        {pages > 1 && <nav aria-label="Request pages" className="flex flex-wrap items-center gap-4">
          {page > 1 && <Link className="inline-flex min-h-11 items-center underline" href={`/account?page=${page - 1}`}>Newer requests</Link>}
          <span className="text-sm">Page {Math.min(page, pages)} of {pages}</span>
          {page < pages && <Link className="inline-flex min-h-11 items-center underline" href={`/account?page=${page + 1}`}>Older requests</Link>}
        </nav>}
      </section>
      {site && <Link className="inline-flex min-h-11 items-center justify-self-start underline" href="/services">Browse services</Link>}
    </>}
  </div></section></main></PublicShell>;
}

export async function AccountResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [site, params] = await Promise.all([getPublicConstructionSite(), searchParams]);
  const token = typeof params.token === "string" ? params.token.slice(0, 200) : "";
  return <PublicShell site={site} account><main className="sf-main"><section className="sf-section"><div className="sf-wrap grid min-w-0 max-w-xl gap-6 py-8">
    <h1 className="text-3xl font-semibold">Password</h1>
    {token ? <ResetPasswordForm token={token} /> : <ResetRequestForm />}
  </div></section></main></PublicShell>;
}

function ContractorContact({ site }: { site: PublicConstructionSite | null }) {
  const email = site?.inquiryEmail?.trim();
  const phone = site?.inquiryPhone?.trim();
  if (!email && !phone) return <p>The contractor will contact you to arrange payment and scheduling.</p>;
  return <p>The contractor will contact you to arrange payment and scheduling. You can also reach them at{" "}
    {email && <a className="underline" href={`mailto:${email}`}>{email}</a>}
    {email && phone && " or "}
    {phone && <a className="underline" href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a>}.
  </p>;
}

export async function CustomerRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [site, user] = await Promise.all([getPublicConstructionSite(), getCustomerUser()]);
  if (!user) return <PublicShell site={site} account><main className="sf-main"><div className="sf-wrap grid gap-6 py-10"><h1 className="text-3xl font-semibold">Sign in</h1><SignInChoices site={site} from={`/account/requests/${encodeURIComponent(id)}`} /></div></main></PublicShell>;
  const request = await getCustomerRequest(id);
  if (!request) notFound();
  const snapshot = request.acceptedSnapshot;
  const expired = isQuoteExpired(request);
  const quoted = hasIssuedQuote(request);
  return <PublicShell site={site} account><main className="sf-main"><section className="sf-section"><div className="sf-wrap grid min-w-0 gap-6 py-8">
    <Link className="inline-flex min-h-11 items-center justify-self-start underline" href="/account">Account</Link>
    <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold"><span aria-hidden="true" className="size-2 rounded-full bg-current" />{request.serviceTitle}</h1>
    <p>{request.reference} · {statusLabel(request)}</p>
    <section className="grid min-w-0 gap-4 rounded-lg border p-5">
      <h2 className="text-xl font-semibold">{snapshot ? String(snapshot.serviceTitle) : request.serviceTitle}</h2>
      <p className="whitespace-pre-wrap break-words">{snapshot ? String(snapshot.scope) : request.scope}</p>
      {quoted ? <><p className="text-2xl font-semibold">{formatUsdMinor(snapshot ? String(snapshot.totalMinor) : request.quoteMinor)}</p>
        <p className="whitespace-pre-wrap break-words">{snapshot ? String(snapshot.terms) : request.quoteTerms}</p>
        {request.expiresAt && !snapshot && <p>{expired ? "Expired" : "Expires"} {new Date(request.expiresAt).toISOString().replace("T", " ").slice(0, 16)} UTC</p>}
      </> : <p>{request.status === "cancelled" ? "Cancelled before a quote was issued." : "No quote yet. The contractor will review your request."}</p>}
    </section>
    {request.status === "payment_pending" && <section className="grid min-w-0 gap-2 rounded-lg border p-5" role="status">
      <h2 className="text-xl font-semibold">Quote accepted</h2>
      <ContractorContact site={site} />
    </section>}
    {expired && <section className="grid min-w-0 gap-2 rounded-lg border p-5">
      <h2 className="text-xl font-semibold">This quote has expired</h2>
      <p>Ask the contractor for an updated quote.</p>
      {request.serviceSlug && site && <Link className="inline-flex min-h-11 items-center justify-self-start underline" href={`/account?service=${encodeURIComponent(request.serviceSlug)}`}>Request an updated quote</Link>}
    </section>}
    <div className="flex flex-wrap items-start gap-4">
      {request.status === "quoted" && !expired && <RequestDecision request={request} operation="accept" label="Accept quote" />}
      {request.status !== "cancelled" && <RequestDecision request={request} operation="cancel" label="Cancel request" />}
    </div>
  </div></section></main></PublicShell>;
}
