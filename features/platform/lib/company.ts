import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";

export type PlatformCompany = { id: string; name: string };

/** Companies this session can read, for company-level registers. */
export async function getPlatformCompanies(): Promise<PlatformCompany[]> {
  const response = await keystoneClient<{ companies: PlatformCompany[] }>(`
    query PlatformCompanies {
      companies(where: { status: { equals: active } }, orderBy: [{ name: asc }], take: 50) { id name }
    }
  `);
  if (!response.success) throw new Error("Companies are unavailable");
  return response.data.companies;
}

/** The company named in `?company=`, or the first readable one. */
export function pickCompany(companies: PlatformCompany[], requested: string | undefined): PlatformCompany | null {
  return companies.find(company => company.id === requested) ?? companies[0] ?? null;
}
