import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";

export type StructureProject = { id: string; projectNumber: string | null; name: string; status: string; company: { id: string; name: string } | null };
export type BudgetCodeRow = {
  id: string; code: string; description: string; costType: string; isActive: boolean;
  costCode: { id: string; code: string; name: string } | null;
  budgetLineItemsCount: number | null; directCostsCount: number | null;
};
export type LocationRow = { id: string; code: string; name: string; locationType: string; parent: { id: string } | null; childrenCount: number | null };
export type CostCodeOption = { id: string; code: string; name: string };

export type ProjectStructure = {
  project: StructureProject;
  budgetCodes: BudgetCodeRow[];
  locations: LocationRow[];
  costCodes: CostCodeOption[];
};

const LIMIT = 500;

export async function getProjectStructure(projectId: string): Promise<ProjectStructure | null> {
  const response = await keystoneClient<{ project: StructureProject | null; budgetCodes: BudgetCodeRow[]; projectLocations: LocationRow[] }>(`
    query ProjectStructure($projectId: ID!, $take: Int!) {
      project(where: { id: $projectId }) { id projectNumber name status company { id name } }
      budgetCodes(where: { project: { id: { equals: $projectId } } }, orderBy: [{ code: asc }], take: $take) {
        id code description costType isActive costCode { id code name } budgetLineItemsCount directCostsCount
      }
      projectLocations(where: { project: { id: { equals: $projectId } } }, orderBy: [{ code: asc }], take: $take) {
        id code name locationType parent { id } childrenCount
      }
    }
  `, { projectId, take: LIMIT });
  if (!response.success) throw new Error("Project structure is unavailable");
  const { project } = response.data;
  if (!project) return null;
  let costCodes: CostCodeOption[] = [];
  if (project.company) {
    const codes = await keystoneClient<{ costCodes: CostCodeOption[] }>(`
      query ProjectCostCodeOptions($companyId: ID!, $take: Int!) {
        costCodes(where: { company: { id: { equals: $companyId } }, isActive: { equals: true } }, orderBy: [{ code: asc }], take: $take) { id code name }
      }
    `, { companyId: project.company.id, take: LIMIT });
    if (codes.success) costCodes = codes.data.costCodes;
  }
  return { project, budgetCodes: response.data.budgetCodes, locations: response.data.projectLocations, costCodes };
}
