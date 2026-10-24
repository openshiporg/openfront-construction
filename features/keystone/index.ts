import { createAuth } from "@keystone-6/auth";
import { config } from "@keystone-6/core";
import "dotenv/config";

import { permissions } from "./access";
import { requirePostgresDatabaseUrl } from "./domain/database-url";
import { requireSessionSecret } from "./domain/session-secret";
import { databaseSessions } from "./domain/session-strategy";
import { sendPasswordResetEmail } from "./lib/mail";
import { models } from "./models";
import { permissionsList } from "./models/fields";
import { extendGraphqlSchema } from "./mutations";

// `keystone build` and `next build` load this config but never connect or sign a
// session, so the build step does not depend on runtime variables being present.
const isBuildStep = process.env.NEXT_PHASE === "phase-production-build" || process.argv[2] === "build";

const databaseURL = isBuildStep
  ? process.env.DATABASE_URL?.trim() || "postgresql://build:build@localhost:5432/build"
  : requirePostgresDatabaseUrl(process.env.DATABASE_URL);

const sessionConfig = {
  maxAge: 60 * 60 * 8,
  secret: isBuildStep && !process.env.SESSION_SECRET?.trim()
    ? "build-step-placeholder-never-used-to-sign-sessions"
    : requireSessionSecret(),
};

const initialRolePermissions = Object.fromEntries(
  permissionsList.map(permission => [permission, true]),
);

const { withAuth } = createAuth({
  listKey: "User",
  identityField: "email",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "email", "password"],
    itemData: {
      role: {
        create: {
          name: "Platform Administrator",
          ...initialRolePermissions,
        },
      },
    },
  },
  passwordResetLink: {
    async sendToken({ itemId, identity, token, context }) {
      // Employees reset on the dashboard; customers and portal participants
      // reset on the public website, so the link never sends them to the dashboard.
      const user = await context.sudo().query.User.findOne({ where: { id: String(itemId) }, query: "role { canAccessDashboard }" });
      const resetPath = user?.role?.canAccessDashboard ? "/dashboard/reset" : "/account/reset";
      await sendPasswordResetEmail(token, identity, undefined, resetPath);
    },
  },
  sessionData: `
    id
    name
    email
    isActive
    role {
      id
      name
      ${permissionsList.join("\n")}
    }
    companyMemberships {
      status
      canAccessAllProjects
      company { id name brandName brandMark brandTagline brandColor }
      role { id name ${permissionsList.join("\n")} }
    }
    projectMemberships {
      status
      accessLevel
      portalType
      project { id company { id } }
      portalOrganization { id name partnerType }
      role { id name ${permissionsList.join("\n")} }
    }
  `,
});

export default withAuth(
  config({
    db: {
      provider: "postgresql",
      url: databaseURL,
    },
    lists: models,
    // Construction files use the verified private-object adapter. No current
    // List uses starter my_images; do not instantiate an unused cloud client.
    ui: {
      isAccessAllowed: ({ session }) => permissions.canAccessDashboard({ session }),
      basePath: "/dashboard",
    },
    session: databaseSessions(sessionConfig),
    graphql: {
      extendGraphqlSchema,
    },
  }),
);
