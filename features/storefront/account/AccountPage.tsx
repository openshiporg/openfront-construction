import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LogOut, Mail, Phone } from "lucide-react";
import { PublicShell, telHref } from "../components/PublicShell";
import { Empty, Pill, Status, Track, type DotTone } from "../components/ui";
import { getPublicConstructionService, getPublicConstructionSite } from "../data";
import type { PublicConstructionSite } from "../types";
import { CUSTOMER_REQUEST_PAGE_SIZE, getCustomerRequest, getCustomerRequestCount, getCustomerRequests, getCustomerUser, type CustomerRequest } from "./data";
import { CustomerAuthForm, ProfileForm, RequestDecision, RequestForm, ResetPasswordForm, ResetRequestForm } from "./AccountForms";
import { customerSignOut } from "./actions";
import { customerContinuation } from "./continuation";
import { formatUsdMinor } from "@/features/lib/money";

const STATUS: Record<string, { label: string; tone: DotTone }> = {
  requested: { label: "Awaiting quote", tone: "warn" },
  quoted: { label: "Quote ready", tone: "busy" },
  payment_pending: { label: "Accepted", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "stop" },
};

/** An issued quote always has a positive amount and terms; the model default is not a quote. */
function hasIssuedQuote(request: CustomerRequest) {
  return Boolean(request.acceptedSnapshot) || (request.quoteMinor !== "0" && Boolean(request.quoteTerms));
}

function isQuoteExpired(request: CustomerRequest, now = Date.now()) {
  return request.status === "quoted" && (!request.expiresAt || new Date(request.expiresAt).getTime() <= now);
}

function RequestStatus({ request }: { request: CustomerRequest }) {
  if (isQuoteExpired(request)) return <Status tone="stop">Quote expired</Status>;
  const status = STATUS[request.status] ?? { label: request.status.replaceAll("_", " "), tone: "idle" as DotTone };
  return <Status tone={status.tone}>{status.label}</Status>;
}

function quoteAmount(request: CustomerRequest) {
  return formatUsdMinor(request.acceptedSnapshot ? String(request.acceptedSnapshot.totalMinor) : request.quoteMinor);
}

function SignInChoices({ site, service, from }: { site: PublicConstructionSite | null; service?: string; from?: string }) {
  // New accounts are offered only on a published website; existing customers can always sign in.
  return <div className="sf-split" style={{ alignItems: "start" }}>
    <CustomerAuthForm service={service} from={from} />
    {site && <CustomerAuthForm signup service={service} from={from} />}
  </div>;
}

function PageHead({ kicker, title, actions, back }: { kicker?: string; title: string; actions?: React.ReactNode; back?: React.ReactNode }) {
  return <header className="sf-pagehead">
    <div className="sf-wrap">
      {back ? <div className="sf-back">{back}</div> : null}
      {kicker ? <p className="sf-kicker">{kicker}</p> : null}
      <div className="sf-pagehead__row" style={{ justifyContent: "space-between" }}>
        <h1 className="sf-display sf-h1">{title}</h1>
        {actions}
      </div>
    </div>
  </header>;
}

function SignOut() {
  return <form action={customerSignOut} className="sf-track"><button className="sf-pill sf-pill--raised sf-pill--sm"><LogOut />Sign out</button></form>;
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
  return <PublicShell site={site} account current="/account">
    <main>
      <PageHead kicker={user ? user.email : from === "/portal" ? "Client portal" : undefined} title={user ? `Hi, ${user.name.split(" ")[0] || "there"}` : "Account"} actions={user ? <SignOut /> : undefined} />
      <section className="sf-section">
        <div className="sf-wrap sf-stack sf-stack--lg">
          {service && <section className="sf-panel sf-stack" aria-labelledby="service-request-title">
            <div>
              <p className="sf-kicker">Quote request{service.market ? ` · ${service.market}` : ""}</p>
              <h2 id="service-request-title" className="sf-panel__title sf-mt-sm">{service.title}</h2>
              <p className="sf-small sf-mt-sm">{service.summary}</p>
            </div>
            {user && (site?.acceptingInquiries ? <RequestForm serviceSlug={service.slug} /> : <p className="sf-status"><span aria-hidden="true" className="sf-dot" />Quote requests are paused</p>)}
          </section>}
          {!user ? <SignInChoices site={site} service={service?.slug} from={from} /> : (
            <div className="sf-split">
              <section className="sf-stack" aria-labelledby="requests-title">
                <div className="sf-panel__head" style={{ marginBottom: 0 }}>
                  <h2 id="requests-title" className="sf-panel__title">Quote requests <span className="sf-mono sf-small">{total}</span></h2>
                  {site && <Track><Pill href="/services" variant="raised" size="sm">New request</Pill></Track>}
                </div>
                {requests.length === 0 ? <Empty title="No requests yet" action={site ? <Track><Pill href="/services" variant="primary">Browse services</Pill></Track> : undefined} /> : (
                  <ul className="sf-list">{requests.map(request => <li key={request.id}>
                    <Link href={`/account/requests/${request.id}`} className="sf-list__item sf-list__item--split">
                      <span className="sf-stack" style={{ gap: "0.3rem" }}>
                        <span className="sf-list__ref">{request.reference}</span>
                        <span className="sf-list__title">{request.serviceTitle}<RequestStatus request={request} /></span>
                      </span>
                      {hasIssuedQuote(request) ? <span className="sf-amount">{quoteAmount(request)}</span> : <span className="sf-small">—</span>}
                    </Link>
                  </li>)}</ul>
                )}
                {pages > 1 && <nav aria-label="Request pages" className="sf-row">
                  <Track>
                    {page > 1 ? <Pill href={`/account?page=${page - 1}`} variant="raised" size="sm">Newer</Pill> : <span className="sf-pill sf-pill--sm" aria-disabled="true">Newer</span>}
                    <span className="sf-small sf-mono" style={{ padding: "0 0.5rem" }}>{Math.min(page, pages)} / {pages}</span>
                    {page < pages ? <Pill href={`/account?page=${page + 1}`} variant="raised" size="sm">Older</Pill> : <span className="sf-pill sf-pill--sm" aria-disabled="true">Older</span>}
                  </Track>
                </nav>}
              </section>
              <div className="sf-stack">
                <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone ?? "" }} />
                <div className="sf-panel sf-row" style={{ justifyContent: "space-between" }}>
                  <span className="sf-panel__title">Client portal</span>
                  <Track><Pill href="/portal" variant="raised" size="sm">Open</Pill></Track>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  </PublicShell>;
}

export async function AccountResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [site, params] = await Promise.all([getPublicConstructionSite(), searchParams]);
  const token = typeof params.token === "string" ? params.token.slice(0, 200) : "";
  return <PublicShell site={site} account current="/account">
    <main>
      <PageHead title="Password" />
      <section className="sf-section"><div className="sf-wrap" style={{ maxWidth: "34rem" }}>
        {token ? <ResetPasswordForm token={token} /> : <ResetRequestForm />}
      </div></section>
    </main>
  </PublicShell>;
}

function ContractorContact({ site }: { site: PublicConstructionSite | null }) {
  const email = site?.inquiryEmail?.trim();
  const phone = site?.inquiryPhone?.trim();
  if (!email && !phone) return null;
  return <div className="sf-contact">
    {phone && <a href={telHref(phone)}><Phone />{phone}</a>}
    {email && <a href={`mailto:${email}`}><Mail />{email}</a>}
  </div>;
}

export async function CustomerRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [site, user] = await Promise.all([getPublicConstructionSite(), getCustomerUser()]);
  if (!user) return <PublicShell site={site} account current="/account"><main><PageHead title="Sign in" /><section className="sf-section"><div className="sf-wrap"><SignInChoices site={site} from={`/account/requests/${encodeURIComponent(id)}`} /></div></section></main></PublicShell>;
  const request = await getCustomerRequest(id);
  if (!request) notFound();
  const snapshot = request.acceptedSnapshot;
  const expired = isQuoteExpired(request);
  const quoted = hasIssuedQuote(request);
  return <PublicShell site={site} account current="/account">
    <main>
      <PageHead
        back={<Track><Pill href="/account" variant="raised" size="sm"><ArrowLeft />Account</Pill></Track>}
        kicker={request.reference}
        title={snapshot ? String(snapshot.serviceTitle) : request.serviceTitle}
        actions={<RequestStatus request={request} />}
      />
      <section className="sf-section">
        <div className="sf-wrap sf-split">
          <div className="sf-prose">
            <div><h2>Scope</h2><p className="sf-body" style={{ overflowWrap: "anywhere" }}>{snapshot ? String(snapshot.scope) : request.scope}</p></div>
            {quoted && <div><h2>Terms</h2><p className="sf-body" style={{ overflowWrap: "anywhere" }}>{snapshot ? String(snapshot.terms) : request.quoteTerms}</p></div>}
          </div>
          <aside className="sf-stack sf-sticky">
            <section className="sf-panel sf-stack" aria-labelledby="quote-title">
              <h2 id="quote-title" className="sf-kicker">Quote</h2>
              {quoted ? <>
                <p className="sf-amount sf-amount--xl">{quoteAmount(request)}</p>
                {request.expiresAt && !snapshot && <p className="sf-small sf-mono">{expired ? "Expired" : "Valid until"} {new Date(request.expiresAt).toISOString().replace("T", " ").slice(0, 16)} UTC</p>}
              </> : <p className="sf-small">{request.status === "cancelled" ? "Cancelled before a quote was issued" : "Not quoted yet"}</p>}
              {request.status === "quoted" && !expired && <RequestDecision request={request} operation="accept" label="Accept quote" />}
              {request.status !== "cancelled" && <RequestDecision request={request} operation="cancel" label="Cancel request" />}
            </section>
            {request.status === "payment_pending" && <section className="sf-notice sf-notice--ok" role="status">
              <span aria-hidden="true" className="sf-dot sf-dot--ok" />
              <div className="sf-stack" style={{ gap: "0.5rem" }}><strong>Quote accepted</strong><ContractorContact site={site} /></div>
            </section>}
            {expired && <section className="sf-notice sf-notice--warn">
              <span aria-hidden="true" className="sf-dot sf-dot--warn" />
              <div className="sf-stack" style={{ gap: "0.75rem" }}>
                <strong>Quote expired</strong>
                {request.serviceSlug && site && <Track><Pill href={`/account?service=${encodeURIComponent(request.serviceSlug)}`} variant="raised" size="sm">Request an updated quote</Pill></Track>}
              </div>
            </section>}
          </aside>
        </div>
      </section>
    </main>
  </PublicShell>;
}
