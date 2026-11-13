/**
 * Count-filter attack through relations, run as anonymous and as limited and admin roles.
 * Needs DATABASE_URL (a migrated scratch database) and SESSION_SECRET.
 * Run: npx tsx tests/integration/relation-filter-access.ts
 */
import assert from "node:assert/strict";

import { getContext } from "@keystone-6/core/context";
import * as PrismaModule from "@prisma/client";

import config from "../../keystone";
import { permissionsList } from "../../features/keystone/models/fields";

const context = getContext(config, PrismaModule);
const sudo = context.sudo();
const tag = `flt${Date.now().toString(36)}`;
const SECRET_NAME = "Zelda Hidden";
const SECRET_EMAIL = `zelda.${tag}@example.com`;

const allFalse = Object.fromEntries(permissionsList.map(p => [p, false]));
const roleData = (name: string, on: string[]) => ({
  name, ...allFalse, ...Object.fromEntries(on.map(p => [p, true])),
});

async function seed() {
  const company = await sudo.db.Company.createOne({ data: { name: `Acme ${tag}`, slug: `acme-${tag}`, email: `ops.${tag}@example.com` } });
  const admin = await sudo.db.User.createOne({ data: {
    name: "Ada Admin", email: `ada.${tag}@example.com`, password: "Correct-Horse-Battery-1",
    role: { create: { ...roleData("Admin", permissionsList), company: { connect: { id: company.id } } } },
  } });
  const limitedRole = await sudo.db.Role.createOne({ data: { ...roleData("Limited", ["canReadProjects", "canAccessDashboard"]), company: { connect: { id: company.id } } } });
  const limited = await sudo.db.User.createOne({ data: {
    name: "Lena Limited", email: `lena.${tag}@example.com`, password: "Correct-Horse-Battery-2",
    role: { connect: { id: limitedRole.id } },
  } });
  const secret = await sudo.db.User.createOne({ data: {
    name: SECRET_NAME, email: SECRET_EMAIL, password: "Correct-Horse-Battery-3",
    jobTitle: "Hidden Title", phone: "+15550001111",
  } });
  const adminRoleId = (await sudo.query.User.findOne({ where: { id: String(admin.id) }, query: "role { id }" })).role.id as string;
  for (const [user, roleId] of [[admin, adminRoleId], [limited, limitedRole.id], [secret, limitedRole.id]] as const) {
    await sudo.db.CompanyMembership.createOne({ data: {
      company: { connect: { id: company.id } }, user: { connect: { id: user.id } },
      role: { connect: { id: roleId } },
      status: "active", canAccessAllProjects: true,
    } });
  }
  const project = await sudo.db.Project.createOne({ data: {
    company: { connect: { id: company.id } }, name: `Tower ${tag}`, projectNumber: `P-${tag}`.slice(0, 40),
    projectManager: { connect: { id: secret.id } },
  } as never });
  return { company, admin, limited, secret, project };
}

type Probe = { label: string; list: string; where: Record<string, unknown> };

function probes(): Probe[] {
  const hit = { startsWith: "Zelda" };
  const miss = { startsWith: "Qqqq" };
  const make = (label: string, list: string, path: (v: unknown) => Record<string, unknown>): Probe[] =>
    [{ label: `${label} hit`, list, where: path(hit) }, { label: `${label} miss`, list, where: path(miss) }];
  const email = (v: unknown) => ({ ...(v as object) });
  void email;
  return [
    ...make("Project.projectManager.name", "Project", v => ({ projectManager: { name: v } })),
    ...make("Project.projectManager.email", "Project", v => ({ projectManager: { email: v } })),
    ...make("Project.company.memberships.user.name", "Project", v => ({ company: { memberships: { some: { user: { name: v } } } } })),
    ...make("Company.memberships.user.name", "Company", v => ({ memberships: { some: { user: { name: v } } } })),
    ...make("Company.roles.assignedTo.name", "Company", v => ({ roles: { some: { assignedTo: { some: { name: v } } } } })),
    ...make("Role.assignedTo.name", "Role", v => ({ assignedTo: { some: { name: v } } })),
    ...make("User.name", "User", v => ({ name: v })),
    ...make("User.jobTitle", "User", v => ({ jobTitle: v })),
    ...make("User.phone", "User", v => ({ phone: v })),
    ...make("CompanyMembership.user.name", "CompanyMembership", v => ({ user: { name: v } })),
    ...make("ProjectMembership.user.name", "ProjectMembership", v => ({ user: { name: v } })),
    ...make("Project.memberships.user.name", "Project", v => ({ memberships: { some: { user: { name: v } } } })),
    ...make("Project.createdByUser.name", "Project", v => ({ createdByUser: { name: v } })),
    ...make("Project.agentActions.reason", "Project", v => ({ agentActions: { some: { reason: v } } })),
    ...make("Company.apiCredentials.tokenPrefix", "Company", v => ({ apiCredentials: { some: { tokenPrefix: v } } })),
    ...make("Company.paymentProviders.name", "Company", v => ({ paymentProviders: { some: { name: v } } })),
    ...make("Company.serviceRequests.customer.name", "Company", v => ({ serviceRequests: { some: { customer: { name: v } } } })),
    ...make("Company.intakeSubmissions.email", "Company", v => ({ intakeSubmissions: { some: { email: v } } })),
    ...make("Company.constructionLeads.email", "Company", v => ({ constructionLeads: { some: { email: v } } })),
  ];
}

async function count(ctx: typeof context, list: string, where: Record<string, unknown>): Promise<string> {
  try {
    return String(await ctx.query[list].count({ where }));
  } catch (error) {
    return `error:${(error as Error).message.split("\n")[0].slice(0, 80)}`;
  }
}

async function main() {
  const seeded = await seed();
  const sessionFor = async (userId: string) => {
    const data = await sudo.query.User.findOne({
      where: { id: userId },
      query: `id name email isActive role { id name ${permissionsList.join(" ")} }
        companyMemberships { status canAccessAllProjects company { id } role { id name ${permissionsList.join(" ")} } }
        projectMemberships { status accessLevel portalType project { id company { id } } role { id name ${permissionsList.join(" ")} } }`,
    });
    return { itemId: userId, listKey: "User", data };
  };
  const anonymous = context;
  const limited = context.withSession(await sessionFor(String(seeded.limited.id)));
  const admin = context.withSession(await sessionFor(String(seeded.admin.id)));

  const failures: string[] = [];
  const table: string[] = [];
  for (const probe of probes()) {
    const results: Record<string, string> = {};
    for (const [who, ctx] of [["anonymous", anonymous], ["limited", limited]] as const) {
      results[who] = await count(ctx, probe.list, probe.where);
    }
    results.admin = await count(admin, probe.list, probe.where);
    table.push(`${probe.label.padEnd(52)} anon=${results.anonymous.padEnd(10)} limited=${results.limited.padEnd(10)} admin=${results.admin}`);
    // Pair hit/miss: a limited or anonymous caller must not see a different count for existing vs absent values.
    if (probe.label.endsWith(" hit")) {
      const miss = probes().find(p => p.label === probe.label.replace(/ hit$/, " miss"))!;
      for (const [who, ctx] of [["anonymous", anonymous], ["limited", limited]] as const) {
        const a = results[who];
        const b = await count(ctx, miss.list, miss.where);
        if (a !== b) failures.push(`${who}: ${probe.label} hit=${a} miss=${b}`);
      }
    }
  }
  console.log(table.join("\n"));

  // Admin keeps real filters: the hidden project manager is found by name.
  const adminHit = await count(admin, "Project", { projectManager: { name: { startsWith: "Zelda" } } });
  const adminMiss = await count(admin, "Project", { projectManager: { name: { startsWith: "Qqqq" } } });
  console.log(`admin keeps filters: hit=${adminHit} miss=${adminMiss}`);
  assert.equal(adminHit, "1", "admin should still filter through relations");
  assert.equal(adminMiss, "0");

  // Secrets are never filterable, even for admin.
  const tokenFilter = await count(admin, "ApiCredential", { tokenHash: { startsWith: "a" } });
  assert.ok(tokenFilter.startsWith("error:"), `tokenHash must not be filterable: ${tokenFilter}`);
  const passwordLeak = await count(admin, "User", { password: { isSet: true } });
  console.log(`admin User.password isSet filter: ${passwordLeak}`);

  assert.deepEqual(failures, [], failures.join("\n"));
  console.log("OK: anonymous and limited counts do not depend on hidden values");
  await context.prisma.$disconnect();
}

main().catch(error => { console.error(error); process.exit(1); });
