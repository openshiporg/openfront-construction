import { CreatePage } from "@/features/dashboard/screens/CreatePage";
import { ItemPage } from "@/features/dashboard/screens/ItemPage";

export function OpportunityCreatePage() {
  return <CreatePage params={Promise.resolve({ listKey: "construction-opportunities" })} />;
}

export async function OpportunityItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ItemPage params={Promise.resolve({ listKey: "construction-opportunities", id })} />;
}

export async function PublicRequestItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ItemPage params={Promise.resolve({ listKey: "intake-submissions", id })} />;
}
