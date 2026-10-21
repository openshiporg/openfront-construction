import { denyAll } from "@keystone-6/core/access";
import { relationship, timestamp } from "@keystone-6/core/fields";

const systemManaged = {
  read: () => true,
  create: () => false,
  update: () => false,
};

const actor = ({ context }: { context: { session?: { itemId?: string } } }) =>
  context.session?.itemId ? { connect: { id: context.session.itemId } } : undefined;

const creator = (args: { operation: "create" | "update"; context: { session?: { itemId?: string } } }) =>
  args.operation === "create" ? actor(args) : undefined;

export const trackingFields = {
  createdByUser: relationship({
    ref: "User",
    access: { create: denyAll, update: denyAll },
    hooks: { resolveInput: creator },
    ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } },
  }),
  updatedByUser: relationship({
    ref: "User",
    access: { create: denyAll, update: denyAll },
    hooks: { resolveInput: actor },
    ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } },
  }),
  createdAt: timestamp({
    access: systemManaged,
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" },
    },
  }),
  updatedAt: timestamp({
    access: systemManaged,
    db: { updatedAt: true },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" },
    },
  }),
};
