import { createHash } from "node:crypto";

function text(value: unknown, fallback = "") { return typeof value === "string" && value ? value : fallback; }
function bounded(value: string, max = 4000) { return value.length <= max ? value : value.slice(0, max) + "…"; }
function related(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {};
}
function moneyLabel(value: unknown, currency: unknown) {
  const code = text(currency);
  const raw = String(value ?? "");
  if (!/^-?\d+$/.test(raw) || (typeof value === "number" && !Number.isSafeInteger(value))) return code ? code + " —" : "Amount not recorded";
  if (code !== "USD") return (code || "Currency not recorded") + " " + raw + " minor units";
  const minor = BigInt(raw), absolute = minor < BigInt(0) ? -minor : minor;
  return `USD ${minor < BigInt(0) ? "-" : ""}${absolute / BigInt(100)}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
}

function snapshotRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : null;
}

function snapshotScalar(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function addSnapshotValue(lines: string[], label: string, value: unknown) {
  const safe = snapshotScalar(value);
  if (safe) lines.push(`${label}: ${safe}`);
}

function addSnapshotMoney(lines: string[], label: string, value: unknown, currency: unknown) {
  if (value !== null && value !== undefined) lines.push(`${label}: ${moneyLabel(value, currency)}`);
}

function addSnapshotRate(lines: string[], label: string, value: unknown) {
  const raw = String(value ?? "");
  if (!/^\d+$/.test(raw)) return;
  const bps = BigInt(raw);
  if (bps > BigInt(10_000)) throw new Error("Approval snapshot contains an invalid retainage rate");
  lines.push(`${label}: ${bps / BigInt(100)}.${(bps % BigInt(100)).toString().padStart(2, "0")}%`);
}

function addLineItemTerms(
  lines: string[],
  snapshot: Record<string, unknown>,
  currency: unknown,
  fields: Array<{ key: string; label: string }>,
) {
  const items = Array.isArray(snapshot.lineItems) ? snapshot.lineItems : [];
  if (items.length > 500) throw new Error("Approval snapshot exceeds the portal review limit");
  lines.push(`Line items captured: ${items.length}`);
  for (const field of fields) {
    let total = BigInt(0);
    let found = false;
    for (const item of items) {
      const value = snapshotRecord(item)?.[field.key];
      if (value === null || value === undefined) continue;
      try {
        if (!/^-?\d+$/.test(String(value)) || (typeof value === "number" && !Number.isSafeInteger(value))) throw new Error("Invalid amount");
        total += BigInt(String(value));
        found = true;
      } catch {
        throw new Error("Approval snapshot contains invalid line-item amounts");
      }
    }
    if (found) addSnapshotMoney(lines, field.label, total.toString(), currency);
  }
}

export function assertAssignedOwnerApprovalSnapshot(request: Record<string, unknown>, scope: { userId: string; companyId: string; projectId: string; organizationId: string; portalType?: string; roleId: unknown; accessLevel?: string }) {
  const raw = text(request.canonicalSnapshot);
  if (!raw || Buffer.byteLength(raw, "utf8") > 512_000 || createHash("sha256").update(raw).digest("hex") !== request.snapshotDigest) throw new Error("Approval snapshot integrity verification failed");
  let snapshot: Record<string, unknown> | null;
  try { snapshot = snapshotRecord(JSON.parse(raw)); } catch { throw new Error("Approval assignment requires staff review"); }
  const saved = related(snapshot?._approvalAssignment), current = related(request.assignedTo);
  const currentProject = related(current.project), currentUser = related(current.user), currentRole = related(current.role);
  if (!snapshot || snapshot.snapshotVersion !== 2 || related(snapshot.company).id !== scope.companyId || related(snapshot.project).id !== scope.projectId ||
    scope.portalType !== "owner" || typeof scope.roleId !== "string" || scope.accessLevel === "viewer" || !scope.accessLevel ||
    current.status !== "active" || current.portalType !== "owner" || current.accessLevel !== scope.accessLevel ||
    currentUser.id !== scope.userId || currentUser.isActive !== true || currentRole.id !== scope.roleId || related(current.portalOrganization).id !== scope.organizationId ||
    currentProject.id !== scope.projectId || related(currentProject.company).id !== scope.companyId ||
    !current.id || saved.membershipId !== current.id || saved.userId !== scope.userId || saved.roleId !== scope.roleId ||
    saved.portalType !== scope.portalType || saved.organizationId !== scope.organizationId || saved.accessLevel !== scope.accessLevel) throw new Error("Approval assignment requires staff review");
}

export function presentApprovalSnapshot(targetType: string, request: Record<string, unknown>, rawSnapshot: string): string[] {
  if (Buffer.byteLength(rawSnapshot, "utf8") > 512_000) throw new Error("Approval snapshot exceeds the portal review limit");
  if (typeof request.snapshotDigest !== "string" || createHash("sha256").update(rawSnapshot).digest("hex") !== request.snapshotDigest) throw new Error("Approval snapshot integrity verification failed");
  let snapshot: Record<string, unknown> | null = null;
  try {
    snapshot = snapshotRecord(JSON.parse(rawSnapshot));
  } catch {
    throw new Error("Approval snapshot is unavailable for review");
  }
  if (!snapshot || !text(request.targetId) || snapshot.id !== text(request.targetId)) {
    throw new Error("Approval snapshot does not match its request target");
  }
  const amountFieldByType: Record<string, string> = {
    BudgetChange: "totalAmountMinor",
    PrimeContract: "revisedContractMinor",
    ChangeOrder: "totalMinor",
    ProgressClaim: "currentPaymentDueMinor",
    RetainageRelease: "amountMinor",
  };
  const amountField = Object.hasOwn(amountFieldByType, targetType) ? amountFieldByType[targetType] : undefined;
  if (snapshot.snapshotVersion === 2 && snapshot.approvalTarget !== targetType) throw new Error("Approval snapshot type does not match its request");
  if (!amountField) throw new Error("This approval snapshot is not available in the external portal");
  try {
    if (!/^-?\d+$/.test(String(snapshot[amountField] ?? "")) || !/^-?\d+$/.test(String(request.amountMinor ?? "")) || BigInt(String(snapshot[amountField])) !== BigInt(String(request.amountMinor))) {
      throw new Error("Approval amount does not match its immutable snapshot");
    }
  } catch {
    throw new Error("Approval amount does not match its immutable snapshot");
  }

  const lines = [
    `Requested transition: ${bounded(text(request.targetStatus), 100)}`,
    `Amount on request: ${moneyLabel(request.amountMinor, request.currencyCode)}`,
  ];
  const currency = snapshot.currencyCode;
  if (typeof currency !== "string" || currency !== request.currencyCode) throw new Error("Approval currency does not match its immutable snapshot");
  switch (targetType) {
    case "BudgetChange":
      addSnapshotValue(lines, "Budget change", snapshot.number);
      addSnapshotValue(lines, "Title", snapshot.title);
      addSnapshotValue(lines, "Reason", snapshot.reason);
      addSnapshotValue(lines, "Status at request", snapshot.status);
      addSnapshotMoney(lines, "Requested total", snapshot.totalAmountMinor, currency);
      addLineItemTerms(lines, snapshot, currency, [{ key: "amountMinor", label: "Line-item amount total" }]);
      break;
    case "PrimeContract":
      addSnapshotValue(lines, "Prime contract", snapshot.number);
      addSnapshotValue(lines, "Title", snapshot.title);
      addSnapshotValue(lines, "Status at request", snapshot.status);
      addSnapshotMoney(lines, "Original contract", snapshot.originalContractMinor, currency);
      addSnapshotMoney(lines, "Approved changes", snapshot.approvedChangesMinor, currency);
      addSnapshotMoney(lines, "Revised contract", snapshot.revisedContractMinor, currency);
      addLineItemTerms(lines, snapshot, currency, [
        { key: "scheduledValueMinor", label: "Scheduled line-value total" },
        { key: "revisedValueMinor", label: "Revised line-value total" },
      ]);
      break;
    case "ChangeOrder":
      addSnapshotValue(lines, "Change order", snapshot.number);
      addSnapshotValue(lines, "Title", snapshot.title);
      addSnapshotValue(lines, "Description", snapshot.description);
      addSnapshotValue(lines, "Direction", snapshot.direction);
      addSnapshotValue(lines, "Status at request", snapshot.status);
      addSnapshotMoney(lines, "Change-order total", snapshot.totalMinor, currency);
      addSnapshotValue(lines, "Schedule impact (days)", snapshot.scheduleImpactDays);
      addLineItemTerms(lines, snapshot, currency, [{ key: "amountMinor", label: "Line-item amount total" }]);
      break;
    case "ProgressClaim":
      addSnapshotValue(lines, "Progress claim", snapshot.claimNumber);
      addSnapshotValue(lines, "Status at request", snapshot.status);
      addSnapshotValue(lines, "Period start", snapshot.periodStart);
      addSnapshotValue(lines, "Period end", snapshot.periodEnd);
      addSnapshotValue(lines, "Claim type", snapshot.claimType);
      addSnapshotMoney(lines, "Original contract", snapshot.originalContractMinor, currency);
      addSnapshotMoney(lines, "Approved changes", snapshot.approvedChangesMinor, currency);
      addSnapshotMoney(lines, "Revised contract", snapshot.revisedContractMinor, currency);
      addSnapshotMoney(lines, "Work to date", snapshot.workCompletedToDateMinor, currency);
      addSnapshotMoney(lines, "Stored materials", snapshot.storedMaterialsMinor, currency);
      addSnapshotMoney(lines, "Earned less retainage", snapshot.earnedLessRetainageMinor, currency);
      addSnapshotMoney(lines, "Previous payments", snapshot.previousPaymentsMinor, currency);
      addSnapshotMoney(lines, "Balance to finish", snapshot.balanceToFinishMinor, currency);
      addSnapshotMoney(lines, "Current payment due", snapshot.currentPaymentDueMinor, currency);
      addSnapshotMoney(lines, "Retainage", snapshot.retainageMinor, currency);
      addLineItemTerms(lines, snapshot, currency, [
        { key: "currentWorkMinor", label: "Current work total" },
        { key: "storedMaterialsMinor", label: "Stored materials total" },
        { key: "retainageMinor", label: "Line retainage total" },
        { key: "earnedLessRetainageMinor", label: "Earned less retainage total" },
      ]);
      break;
    case "RetainageRelease":
      addSnapshotValue(lines, "Retainage release", snapshot.releaseNumber);
      addSnapshotValue(lines, "Status at request", snapshot.status);
      addSnapshotMoney(lines, "Release amount", snapshot.amountMinor, currency);
      addSnapshotValue(lines, "Reason", snapshot.reason);
      break;
    default:
      throw new Error("This approval snapshot is not available in the external portal");
  }
  if (snapshot.snapshotVersion !== 2) lines.unshift("A new review is required before this legacy request can be approved.");
  if (targetType === "PrimeContract") {
    addSnapshotValue(lines, "Terms and scope", snapshot.description);
    addSnapshotValue(lines, "Contract type", snapshot.contractType);
    addSnapshotValue(lines, "Start date", snapshot.startDate);
    addSnapshotValue(lines, "Completion date", snapshot.completionDate);
    addSnapshotRate(lines, "Default retainage", snapshot.defaultRetainageBps);
  }
  const prime = related(snapshot.primeContract), commitment = related(snapshot.commitment), claim = related(snapshot.progressClaim), payment = related(snapshot.payment);
  const party = related(snapshot.client ?? snapshot.tradePartner ?? prime.client ?? commitment.tradePartner ?? claim.tradePartner);
  addSnapshotValue(lines, "Counterparty", party.name);
  addSnapshotValue(lines, "Prime contract", prime.number);
  addSnapshotValue(lines, "Commitment", commitment.number);
  addSnapshotValue(lines, "Progress claim", claim.claimNumber);
  addSnapshotValue(lines, "Budget", related(snapshot.budget).name);
  const sourceChange = related(snapshot.sourceChangeEvent);
  addSnapshotValue(lines, "Source change", [text(sourceChange.number), text(sourceChange.title)].filter(Boolean).join(" · "));
  addSnapshotValue(lines, "Invoice reference", snapshot.invoiceNumber);
  addSnapshotValue(lines, "Certification", snapshot.certification);
  const claimLine = related(snapshot.progressClaimLineItem);
  addSnapshotValue(lines, "Claim line", claimLine.description);
  addSnapshotMoney(lines, "Recorded line retainage", claimLine.retainageMinor, currency);
  if (payment.id) {
    addSnapshotValue(lines, "Covering payment", payment.paymentNumber);
    addSnapshotValue(lines, "Payment direction", payment.direction);
    addSnapshotValue(lines, "Payment status", payment.status);
    addSnapshotValue(lines, "Payment reference", payment.reference);
    addSnapshotValue(lines, "Payment date", payment.paidAt);
    addSnapshotValue(lines, "Settlement date", payment.settledAt);
    addSnapshotValue(lines, "Payment counterparty", related(payment.tradePartner).name);
    addSnapshotMoney(lines, "Payment amount", payment.amountMinor, payment.currencyCode);
  }
  const items = Array.isArray(snapshot.lineItems) ? snapshot.lineItems : [];
  if (items.length > 500) throw new Error("Approval snapshot exceeds the supported line review limit");
  items.forEach((value, index) => {
    const item = related(value);
    lines.push(`Item ${index + 1}: ${text(item.description, "Description not captured")}`);
    const code = related(item.budgetCode);
    addSnapshotValue(lines, "Cost code", [text(code.code), text(code.description)].filter(Boolean).join(" · "));
    addSnapshotValue(lines, "Source scope", related(item.changeEventLineItem).description);
    const contractLine = related(item.contractLineItem);
    addSnapshotValue(lines, "Contract line number", contractLine.lineNumber);
    addSnapshotValue(lines, "Contract line", contractLine.description);
    addSnapshotMoney(lines, "Contract line scheduled value", contractLine.scheduledValueMinor, currency);
    addSnapshotMoney(lines, "Contract line revised value", contractLine.revisedValueMinor, currency);
    addSnapshotRate(lines, "Contract line retainage", contractLine.retainageBps);
    for (const [key, label] of Object.entries({ amountMinor: "Amount", scheduledValueMinor: "Scheduled value", approvedChangesMinor: "Approved changes", revisedValueMinor: "Revised value", previousWorkMinor: "Previous work", currentWorkMinor: "Current work", storedMaterialsMinor: "Stored materials", completedStoredToDateMinor: "Completed and stored to date", retainageMinor: "Retainage", earnedLessRetainageMinor: "Earned less retainage", balanceToFinishMinor: "Balance to finish" })) addSnapshotMoney(lines, label, item[key], currency);
    addSnapshotValue(lines, "Percent complete", item.percentComplete);
    addSnapshotRate(lines, "Line retainage", item.retainageBps);
  });
  return lines;
}

