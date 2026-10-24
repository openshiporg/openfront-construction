import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import { equipmentStatuses, materialStatuses, type CatalogKind } from "./lib/states";

export const CATALOG_PAGE_SIZE = 25;

export type EquipmentRow = {
  id: string; equipmentNumber: string; name: string; description: string | null; equipmentType: string | null;
  make: string | null; model: string | null; serialNumber: string | null; ownershipType: string; status: string;
  hourlyCostMinor: string | null; currencyCode: string | null; logsCount: number | null;
};

export type MaterialRow = {
  id: string; sku: string; name: string; description: string | null; unit: string; standardCostMinor: string | null;
  currencyCode: string | null; manufacturer: string | null; modelNumber: string | null; isActive: string;
  logsCount: number | null; procurementRequestLinesCount: number | null;
};

export type CatalogRegister<T> = { items: T[]; totalCount: number; statusCounts: Record<string, number> };

function where(kind: CatalogKind, companyId: string, search: string, status?: string) {
  const statusField = kind === "equipment" ? "status" : "isActive";
  const searchFields = kind === "equipment" ? ["equipmentNumber", "name", "equipmentType", "make", "serialNumber"] : ["sku", "name", "manufacturer", "modelNumber"];
  return {
    company: { id: { equals: companyId } },
    ...(status && status !== "all" ? { [statusField]: { equals: status } } : {}),
    ...(search ? { OR: searchFields.map(field => ({ [field]: { contains: search, mode: "insensitive" } })) } : {}),
  };
}

export async function getEquipmentRegister(companyId: string, page: number, search: string, status: string): Promise<CatalogRegister<EquipmentRow>> {
  const counts = equipmentStatuses.map(value => `${value}: equipmentItemsCount(where: { AND: [$base, { status: { equals: ${value} } }] })`).join("\n      ");
  const response = await keystoneClient<Record<string, unknown> & { items: EquipmentRow[]; total: number }>(`
    query EquipmentRegister($where: EquipmentWhereInput!, $base: EquipmentWhereInput!, $skip: Int!, $take: Int!) {
      items: equipmentItems(where: $where, orderBy: [{ equipmentNumber: asc }], skip: $skip, take: $take) {
        id equipmentNumber name description equipmentType make model serialNumber ownershipType status hourlyCostMinor currencyCode logsCount
      }
      total: equipmentItemsCount(where: $where)
      ${counts}
    }
  `, { where: where("equipment", companyId, search, status), base: where("equipment", companyId, search), skip: (page - 1) * CATALOG_PAGE_SIZE, take: CATALOG_PAGE_SIZE });
  if (!response.success) throw new Error("Equipment is unavailable");
  return { items: response.data.items, totalCount: response.data.total, statusCounts: Object.fromEntries(equipmentStatuses.map(value => [value, Number(response.data[value] ?? 0)])) };
}

export async function getMaterialRegister(companyId: string, page: number, search: string, status: string): Promise<CatalogRegister<MaterialRow>> {
  const counts = materialStatuses.map(value => `${value}: materialsCount(where: { AND: [$base, { isActive: { equals: ${value} } }] })`).join("\n      ");
  const response = await keystoneClient<Record<string, unknown> & { items: MaterialRow[]; total: number }>(`
    query MaterialRegister($where: MaterialWhereInput!, $base: MaterialWhereInput!, $skip: Int!, $take: Int!) {
      items: materials(where: $where, orderBy: [{ sku: asc }], skip: $skip, take: $take) {
        id sku name description unit standardCostMinor currencyCode manufacturer modelNumber isActive logsCount procurementRequestLinesCount
      }
      total: materialsCount(where: $where)
      ${counts}
    }
  `, { where: where("materials", companyId, search, status), base: where("materials", companyId, search), skip: (page - 1) * CATALOG_PAGE_SIZE, take: CATALOG_PAGE_SIZE });
  if (!response.success) throw new Error("Materials are unavailable");
  return { items: response.data.items, totalCount: response.data.total, statusCounts: Object.fromEntries(materialStatuses.map(value => [value, Number(response.data[value] ?? 0)])) };
}
