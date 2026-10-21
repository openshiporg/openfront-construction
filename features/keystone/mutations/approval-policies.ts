import { queryById } from "../domain/tenancy";
import { executeProjectCommand, requiredText, type CommandContext } from "./construction";

export type ApprovalPolicyInput = {
  projectId: string;
  policyId?: string | null;
  name: string;
  domain: string;
  minimumAmountMinor: string;
  approverRoleId: string;
  isActive: boolean;
  idempotencyKey: string;
};

const domains = new Set(["budget_change", "prime_contract", "change_order", "progress_claim", "retainage_release"]);

export async function configureConstructionApprovalPolicy(
  _root: unknown,
  { input }: { input: ApprovalPolicyInput },
  context: CommandContext,
) {
  const projectId = requiredText(input.projectId, "Project id", 200);
  const project = await queryById(context, "Project", projectId, "id currencyCode company { id }");
  const companyId = project?.company?.id;
  if (!companyId) throw new Error("Project not found");
  const roleId = requiredText(input.approverRoleId, "Approver role id", 200);
  const role = await queryById(context, "Role", roleId, "id company { id }");
  if (role?.company?.id !== companyId) throw new Error("Approver role must belong to the project company");
  const domain = requiredText(input.domain, "Approval domain", 80);
  if (!domains.has(domain)) throw new Error("Approval domain is invalid");
  const minimumAmountMinor = requiredText(input.minimumAmountMinor, "Minimum amount", 30);
  if (!/^\d+$/.test(minimumAmountMinor)) throw new Error("Minimum amount must be non-negative integer minor units");
  const policyId = input.policyId ? requiredText(input.policyId, "Policy id", 200) : null;
  if (policyId) {
    const policy = await queryById(context, "ApprovalPolicy", policyId, "id project { id } company { id }");
    if (policy?.project?.id !== projectId || policy.company?.id !== companyId) throw new Error("Approval policy not found in this project");
  }
  return executeProjectCommand({
    context,
    operation: "configureConstructionApprovalPolicy",
    permission: "canManageRoles",
    projectId,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ApprovalPolicy",
    ...(policyId ? { updateId: policyId } : {}),
    data: {
      policyKey: `${companyId}:${projectId}:${domain}:${minimumAmountMinor}`,
      name: requiredText(input.name, "Policy name", 160),
      domain,
      minimumAmountMinor,
      currencyCode: String(project.currencyCode ?? "USD"),
      isActive: Boolean(input.isActive),
      approverRole: { connect: { id: roleId } },
      company: { connect: { id: companyId } },
      project: { connect: { id: projectId } },
    },
  });
}
