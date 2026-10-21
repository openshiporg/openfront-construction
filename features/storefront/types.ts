export type PublicServiceSummary = {
  slug: string;
  title: string;
  summary: string;
  details: string;
  market: string;
};

export type PublicProjectSummary = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  market: string;
  locationLabel: string;
  deliveryMethod: string;
  completionLabel: string;
  approvedOutcome: string;
};

export type PublicConstructionSite = {
  logoIcon: string;
  logoColor: string;
  brandName: string;
  brandMark: string;
  brandTagline: string;
  brandColor: string;
  serviceArea: string;
  capabilitySummary: string;
  inquiryEmail: string;
  inquiryPhone: string;
  privacyNotice: string;
  acceptingInquiries: boolean;
  services: PublicServiceSummary[];
  projects: PublicProjectSummary[];
};

export type PublicIntakeReceipt = {
  publicReference: string;
  kind: string;
  status: string;
  submittedAt: string;
};

export type PublicIntakeState = {
  status: "idle" | "success" | "error";
  message: string;
  publicReference?: string;
  replayed?: boolean;
};

export const initialPublicIntakeState: PublicIntakeState = {
  status: "idle",
  message: "",
};
