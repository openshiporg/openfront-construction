import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import { partnerStatuses } from "./lib/states";

export const TRADE_PARTNER_PAGE_SIZE = 25;

export type TradePartnerRow = {
  id: string; name: string; legalName: string | null; partnerType: string; status: string;
  email: string | null; phone: string | null; city: string | null; stateProvince: string | null;
  commitmentsCount: number | null; bidSubmissionsCount: number | null; ownedProjectsCount: number | null;
};

export type TradePartnerRegister = {
  items: TradePartnerRow[];
  totalCount: number;
  statusCounts: Record<string, number>;
};

function where(companyId: string, search: string, type: string, status?: string) {
  return {
    company: { id: { equals: companyId } },
    ...(type !== "all" ? { partnerType: { equals: type } } : {}),
    ...(status && status !== "all" ? { status: { equals: status } } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { legalName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
  };
}

export async function getTradePartnerRegister(companyId: string, page: number, search: string, type: string, status: string): Promise<TradePartnerRegister> {
  const response = await keystoneClient<Record<string, unknown> & { items: TradePartnerRow[]; total: number }>(`
    query TradePartnerRegister($where: TradePartnerWhereInput!, $base: TradePartnerWhereInput!, $skip: Int!, $take: Int!) {
      items: tradePartners(where: $where, orderBy: [{ name: asc }], skip: $skip, take: $take) {
        id name legalName partnerType status email phone city stateProvince
        commitmentsCount bidSubmissionsCount ownedProjectsCount
      }
      total: tradePartnersCount(where: $where)
      ${partnerStatuses.map(value => `${value}: tradePartnersCount(where: { AND: [$base, { status: { equals: ${value} } }] })`).join("\n      ")}
    }
  `, { where: where(companyId, search, type, status), base: where(companyId, search, type), skip: (page - 1) * TRADE_PARTNER_PAGE_SIZE, take: TRADE_PARTNER_PAGE_SIZE });
  if (!response.success) throw new Error("Trade partners are unavailable");
  const statusCounts = Object.fromEntries(partnerStatuses.map(value => [value, Number(response.data[value] ?? 0)]));
  return { items: response.data.items, totalCount: response.data.total, statusCounts };
}

type Named = { name: string | null } | null;
type ProjectRef = { id: string; projectNumber: string | null; name: string | null } | null;
export type TradePartnerDetail = TradePartnerRow & {
  website: string | null; addressLine1: string | null; addressLine2: string | null; postalCode: string | null; countryCode: string | null;
  company: { id: string; name: string } | null;
  createdAt: string | null; updatedAt: string | null;
  progressClaimsCount: number | null; paymentsCount: number | null; lienWaiversCount: number | null; procurementRequestsCount: number | null; bidInvitationsCount: number | null;
  ownedProjects: Array<{ id: string; projectNumber: string | null; name: string | null; status: string }>;
  commitments: Array<{ id: string; number: string | null; title: string | null; commitmentType: string; status: string; revisedContractMinor: string | null; paidToDateMinor: string | null; currencyCode: string | null; project: ProjectRef }>;
  bidSubmissions: Array<{ id: string; submissionNumber: string | null; status: string; totalMinor: string | null; currencyCode: string | null; submittedAt: string | null; bidPackage: { title: string | null } | null; project: ProjectRef }>;
  progressClaims: Array<{ id: string; claimNumber: string | null; status: string; currentPaymentDueMinor: string | null; currencyCode: string | null; dueAt: string | null; project: ProjectRef }>;
  payments: Array<{ id: string; paymentNumber: string | null; direction: string; status: string; amountMinor: string | null; currencyCode: string | null; paidAt: string | null; project: ProjectRef }>;
  lienWaivers: Array<{ id: string; waiverNumber: string | null; waiverType: string; status: string; amountMinor: string | null; currencyCode: string | null; throughDate: string | null; project: ProjectRef }>;
  procurementRequests: Array<{ id: string; requestNumber: string | null; title: string | null; status: string; totalEstimatedMinor: string | null; currencyCode: string | null; neededBy: string | null; project: ProjectRef }>;
  projectMembers: Array<{ id: string; status: string; user: Named & { email?: string | null }; project: ProjectRef }>;
};

const RELATED = 8;
const project = "project { id projectNumber name }";

export async function getTradePartnerDetail(id: string): Promise<TradePartnerDetail | null> {
  const response = await keystoneClient<{ tradePartner: TradePartnerDetail | null }>(`
    query TradePartnerDetail($id: ID!, $take: Int!) {
      tradePartner(where: { id: $id }) {
        id name legalName partnerType status email phone website city stateProvince postalCode countryCode addressLine1 addressLine2
        createdAt updatedAt company { id name }
        commitmentsCount bidSubmissionsCount ownedProjectsCount progressClaimsCount paymentsCount lienWaiversCount procurementRequestsCount bidInvitationsCount
        ownedProjects(take: $take, orderBy: [{ createdAt: desc }]) { id projectNumber name status }
        commitments(take: $take, orderBy: [{ createdAt: desc }]) { id number title commitmentType status revisedContractMinor paidToDateMinor currencyCode ${project} }
        bidSubmissions(take: $take, orderBy: [{ createdAt: desc }]) { id submissionNumber status totalMinor currencyCode submittedAt bidPackage { title } ${project} }
        progressClaims(take: $take, orderBy: [{ createdAt: desc }]) { id claimNumber status currentPaymentDueMinor currencyCode dueAt ${project} }
        payments(take: $take, orderBy: [{ createdAt: desc }]) { id paymentNumber direction status amountMinor currencyCode paidAt ${project} }
        lienWaivers(take: $take, orderBy: [{ createdAt: desc }]) { id waiverNumber waiverType status amountMinor currencyCode throughDate ${project} }
        procurementRequests(take: $take, orderBy: [{ createdAt: desc }]) { id requestNumber title status totalEstimatedMinor currencyCode neededBy ${project} }
        projectMembers(take: $take) { id status user { name email } ${project} }
      }
    }
  `, { id, take: RELATED });
  if (!response.success) throw new Error("Trade partner is unavailable");
  return response.data.tradePartner;
}
