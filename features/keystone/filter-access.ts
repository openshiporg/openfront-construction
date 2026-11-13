/**
 * Where-filters and orderBy must not reveal what the session cannot read.
 *
 * Keystone applies a field's `isFilterable`/`isOrderable` to every use of the
 * field in a `where`, including nested relation paths, but it does not tie
 * them to read access. A count such as `projectsCount(where: { company: { memberships:
 * { some: { user: { email: { startsWith: "a" } } } } } })` therefore leaks a
 * value the caller can never read. For every field of every list:
 *
 * - a scalar is filterable/orderable only if the session can read it (denied
 *   reads, such as keys, token hashes and secrets, are never filterable);
 * - a relationship is filterable/orderable only if the session can read the
 *   related list (operation and filter), and into people, membership and role
 *   lists only with the people permission.
 *
 * An explicit `isFilterable`/`isOrderable` on a field is kept and ANDed.
 * Plain module apart from the access imports.
 */
import { hasPermission } from "./access";

type Rule = unknown;
type AnyList = { access?: any; fields?: Record<string, any>; [key: string]: unknown };
type RuleArgs = { session?: any; context?: any };

const PEOPLE_LISTS = new Set(["User", "CompanyMembership", "ProjectMembership"]);

async function run(rule: Rule, args: Record<string, unknown>): Promise<unknown> {
  if (typeof rule === "function") return (rule as (a: unknown) => unknown)(args);
  return rule;
}

async function listReadable(listKey: string, list: AnyList | undefined, { session, context }: RuleArgs): Promise<boolean> {
  if (!list) return false;
  try {
    if (PEOPLE_LISTS.has(listKey) &&
      !hasPermission(session, "canReadPeople") && !hasPermission(session, "canManagePeople")) return false;
    const access = list.access;
    if (access === undefined) return true;
    const args = { session, context, listKey, operation: "query" };
    const operation = typeof access === "function" ? access : access.operation;
    const query = typeof operation === "function" ? operation : operation?.query ?? true;
    if (!(await run(query, args))) return false;
    const filter = typeof access === "function" ? undefined : access.filter?.query;
    if (filter === undefined) return true;
    return (await run(filter, args)) !== false;
  } catch {
    return false;
  }
}

async function scalarReadable(field: any, listKey: string, fieldKey: string, { session, context }: RuleArgs): Promise<boolean> {
  try {
    const access = field.access;
    if (access === undefined) return true;
    const read = typeof access === "function" ? access : typeof access === "object" ? access.read : access;
    if (read === undefined) return true;
    return Boolean(await run(read, { session, context, listKey, fieldKey, operation: "read", item: undefined }));
  } catch {
    return false;
  }
}

export function withFilterAccess<T extends Record<string, AnyList>>(lists: T): T {
  const out: Record<string, AnyList> = {};
  for (const [listKey, list] of Object.entries(lists)) {
    const fields: Record<string, any> = {};
    for (const [fieldKey, fieldFn] of Object.entries(list.fields ?? {})) {
      if (typeof fieldFn !== "function") { fields[fieldKey] = fieldFn; continue; }
      fields[fieldKey] = (meta: unknown) => {
        const resolved = fieldFn(meta);
        const relation = resolved.dbField?.kind === "relation" ? String(resolved.dbField.list) : null;
        const allowed = async (args: RuleArgs) =>
          (await scalarReadable(resolved, listKey, fieldKey, args)) &&
          (!relation || listReadable(relation, lists[relation], args));
        const guard = (explicit: unknown) => async (args: RuleArgs & Record<string, unknown>) =>
          (explicit === undefined || Boolean(await run(explicit, args))) && allowed(args);
        return { ...resolved, isFilterable: guard(resolved.isFilterable), isOrderable: guard(resolved.isOrderable) };
      };
    }
    out[listKey] = { ...list, fields };
  }
  return out as T;
}
