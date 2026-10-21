'use server';

import { searchConstructionProjectOptions, type ConstructionOptionPage } from "./data";

export type OptionSearchResult = ConstructionOptionPage | { error: string };

/** Record lookup for workflow selectors; authorization and project scope are
 * enforced by the constructionProjectOptionSearch resolver. */
export async function searchProjectOptionsAction(
  projectId: string,
  lookup: { kinds: string[]; search?: string; page?: number; ids?: string[] },
): Promise<OptionSearchResult> {
  try {
    return await searchConstructionProjectOptions(projectId, {
      kinds: lookup.kinds.slice(0, 8).map(String),
      search: String(lookup.search ?? "").slice(0, 120),
      page: Math.max(1, Math.trunc(Number(lookup.page) || 1)),
      ids: lookup.ids?.slice(0, 50).map(String),
    });
  } catch {
    return { error: "Records could not be loaded. Try again." };
  }
}
