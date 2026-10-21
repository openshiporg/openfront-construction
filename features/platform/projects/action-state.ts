export type CommandState = {
  status: "idle" | "success" | "error";
  message: string;
  itemId?: string;
  oneTimeSecret?: string;
  oneTimeSecretKind?: "invitation-link" | "api-credential";
};

export const initialCommandState: CommandState = { status: "idle", message: "" };
