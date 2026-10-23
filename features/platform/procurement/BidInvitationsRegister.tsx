import { projectToolHref } from "@/features/platform/lib/navigation";
import type { ProcurementBidInvitationRegisterPage } from "@/features/platform/projects/data";
import { formatDate } from "@/features/platform/components/kit";
import { RegisterFrame, RegisterRow } from "@/features/platform/components/Register";
import { bidInvitationsHref } from "./register-navigation";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "invited", label: "Invited" },
  { value: "viewed", label: "Viewed" },
  { value: "intent_to_bid", label: "Intent to bid" },
  { value: "declined", label: "Declined" },
  { value: "submitted", label: "Submitted" },
] as const;

export function BidInvitationsRegister({ projectId, register, searchParams }: {
  projectId: string;
  register: ProcurementBidInvitationRegisterPage;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <RegisterFrame
      id="bid-invitations" title="Bid invitations" noun="bid invitations" filters={statusFilters}
      page={register.page} pageSize={register.pageSize} totalCount={register.totalCount} totalPages={register.totalPages} status={register.status}
      itemCount={register.items.length} hrefFor={(page, status) => bidInvitationsHref(projectId, searchParams, page, status)}
    >
      {register.items.map(invitation => (
        <RegisterRow
          key={invitation.id}
          reference="Bid package"
          title={invitation.bidPackage ? invitation.bidPackage.number : "Bid package unavailable"}
          href={invitation.bidPackage ? `${projectToolHref(projectId, "")}/records/bid-package/${encodeURIComponent(invitation.bidPackage.id)}` : null}
          status={invitation.status}
          meta={`Sent ${formatDate(invitation.sentAt)} · Responded ${formatDate(invitation.respondedAt)}`}
        />
      ))}
    </RegisterFrame>
  );
}
