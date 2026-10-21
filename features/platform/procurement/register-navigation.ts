import { projectToolHref } from "@/features/platform/lib/navigation";

type SearchParamsState = Record<string, string | string[] | undefined>;
type SearchParamUpdates = Record<string, string | undefined>;

function registerHref(projectId: string, searchParams: SearchParamsState, updates: SearchParamUpdates) {
  const query = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (rawValue === undefined) continue;
    for (const value of Array.isArray(rawValue) ? rawValue : [rawValue]) query.append(key, value);
  }
  for (const [key, value] of Object.entries(updates)) {
    query.delete(key);
    if (value !== undefined) query.set(key, value);
  }
  const base = projectToolHref(projectId, "procurement");
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

export function procurementRequestsHref(projectId: string, searchParams: SearchParamsState, page: number, status: string) {
  return registerHref(projectId, searchParams, {
    page: page > 1 ? String(page) : undefined,
    status: status !== "all" ? status : undefined,
  });
}

export function materialReceiptsHref(projectId: string, searchParams: SearchParamsState, page: number, status: string) {
  return registerHref(projectId, searchParams, {
    materialReceiptPage: page > 1 ? String(page) : undefined,
    materialReceiptStatus: status !== "all" ? status : undefined,
  });
}

export function procurementCommitmentsHref(projectId: string, searchParams: SearchParamsState, page: number, status: string) {
  return registerHref(projectId, searchParams, {
    commitmentPage: page > 1 ? String(page) : undefined,
    commitmentStatus: status !== "all" ? status : undefined,
  });
}

export function bidInvitationsHref(projectId: string, searchParams: SearchParamsState, page: number, status: string) {
  return registerHref(projectId, searchParams, {
    bidInvitationPage: page > 1 ? String(page) : undefined,
    bidInvitationStatus: status !== "all" ? status : undefined,
  });
}

export function procurementLienWaiversHref(projectId: string, searchParams: SearchParamsState, page: number, status: string) {
  return registerHref(projectId, searchParams, {
    lienWaiverPage: page > 1 ? String(page) : undefined,
    lienWaiverStatus: status !== "all" ? status : undefined,
  });
}
