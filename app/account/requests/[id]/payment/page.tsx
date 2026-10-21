import { redirect } from "next/navigation";

// Online payment is not offered; accepted quotes are settled with the contractor from the request page.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/account/requests/${encodeURIComponent((await params).id)}`);
}
