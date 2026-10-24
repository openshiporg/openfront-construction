import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";

export const COST_CODE_PAGE_SIZE = 50;

export type CostCodeRow = {
  id: string; code: string; name: string; division: string | null; description: string | null;
  isActive: boolean; budgetCodesCount: number | null;
};

export type CostCodeRegister = { items: CostCodeRow[]; totalCount: number; activeCount: number; inactiveCount: number };

function where(companyId: string, search: string, active?: boolean) {
  return {
    company: { id: { equals: companyId } },
    ...(active === undefined ? {} : { isActive: { equals: active } }),
    ...(search ? { OR: [{ code: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }, { division: { contains: search, mode: "insensitive" } }] } : {}),
  };
}

export async function getCostCodeRegister(companyId: string, page: number, search: string, state: string): Promise<CostCodeRegister> {
  const active = state === "active" ? true : state === "inactive" ? false : undefined;
  const response = await keystoneClient<{ items: CostCodeRow[]; total: number; active: number; inactive: number }>(`
    query CostCodeRegister($where: CostCodeWhereInput!, $active: CostCodeWhereInput!, $inactive: CostCodeWhereInput!, $skip: Int!, $take: Int!) {
      items: costCodes(where: $where, orderBy: [{ code: asc }], skip: $skip, take: $take) { id code name division description isActive budgetCodesCount }
      total: costCodesCount(where: $where)
      active: costCodesCount(where: $active)
      inactive: costCodesCount(where: $inactive)
    }
  `, {
    where: where(companyId, search, active), active: where(companyId, search, true), inactive: where(companyId, search, false),
    skip: (page - 1) * COST_CODE_PAGE_SIZE, take: COST_CODE_PAGE_SIZE,
  });
  if (!response.success) throw new Error("Cost codes are unavailable");
  return { items: response.data.items, totalCount: response.data.total, activeCount: response.data.active, inactiveCount: response.data.inactive };
}
