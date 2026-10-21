import {
  Kind, getNamedType, isEnumType, isInputObjectType, isInterfaceType, isListType,
  isNonNullType, isObjectType, parse, print, validate,
  type ArgumentNode, type GraphQLCompositeType, type GraphQLField,
  type GraphQLSchema, type GraphQLType, type SelectionSetNode,
} from "graphql";
import { assertGraphQLQueryBudget } from "../domain/graphql-query-budget";

export class McpQueryPolicyError extends Error {}
const fail = (message: string): never => { throw new McpQueryPolicyError(message); };
const PAGE_MAX = 100;
const ROW_BUDGET = 500;
function listType(type: GraphQLType): boolean {
  return isListType(isNonNullType(type) ? type.ofType : type);
}
function pageInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) return fail("Pagination values are outside the supported integer range");
  return value;
}
function intArgument(name: string, value: number): ArgumentNode {
  return { kind: Kind.ARGUMENT, name: { kind: Kind.NAME, value: name }, value: { kind: Kind.INT, value: String(value) } };
}
function rootField(schema: GraphQLSchema, operation: unknown): GraphQLField<unknown, unknown> {
  if (typeof operation !== "string" || !/^[_A-Za-z][_0-9A-Za-z]*$/.test(operation)) return fail("A discovered list operation is required");
  const field = schema.getQueryType()?.getFields()[operation];
  if (!field || !listType(field.type) || !isObjectType(getNamedType(field.type)) || !field.args.some(arg => arg.name === "take")) return fail("This query root cannot be safely paginated");
  return field;
}

/** Resolve actual return types, never lowercase/plural guesses (RFI, Equipment). */
export function resolveModelListOperation(schema: GraphQLSchema, modelName: unknown): string {
  if (typeof modelName !== "string") return fail("A model name is required");
  const model = Object.values(schema.getTypeMap()).find(type => isObjectType(type) && type.name.toLowerCase() === modelName.toLowerCase());
  if (!model) return fail("The requested model was not found");
  const candidates = Object.entries(schema.getQueryType()?.getFields() ?? {}).filter(([, field]) => listType(field.type) && getNamedType(field.type).name === model.name && field.args.some(arg => arg.name === "take"));
  if (candidates.length !== 1) return fail("The model does not have one unambiguous paginated list operation");
  return candidates[0][0];
}

export function buildBoundedReadQuery(schema: GraphQLSchema, input: {
  operation: unknown; fields: unknown; limit?: unknown; skip?: unknown; search?: string;
}) {
  const root = rootField(schema, input.operation);
  const operation = root.name;
  const limit = pageInteger(input.limit, 25, 1, PAGE_MAX);
  const skip = pageInteger(input.skip, 0, 0, 10_000);
  if (typeof input.fields !== "string" || !input.fields.trim() || input.fields.length > 40_000) return fail("A bounded field selection is required");
  let query = `query McpRead { ${operation}(take: ${limit}, skip: ${skip}) { ${input.fields} } }`;
  assertGraphQLQueryBudget(query);
  const document = parse(query);
  if (document.definitions.length !== 1 || document.definitions[0].kind !== Kind.OPERATION_DEFINITION || document.definitions[0].operation !== "query" || document.definitions[0].selectionSet.selections.length !== 1) return fail("Only one read operation is supported");
  const definition = document.definitions[0];
  const variables: Record<string, unknown> = {};
  let rows = 0;
  const bound = (selectionSet: SelectionSetNode, parent: GraphQLCompositeType, multiplier: number): SelectionSetNode => {
    if (!isObjectType(parent) && !isInterfaceType(parent)) return fail("Abstract selections cannot be safely bounded");
    return { ...selectionSet, selections: selectionSet.selections.map(selection => {
      if (selection.kind !== Kind.FIELD) return fail("Fragments are not supported by bounded MCP reads");
      if (selection.name.value === "__typename") return selection;
      const field = parent.getFields()[selection.name.value];
      if (!field) return fail("The selection contains a field absent from the discovered schema");
      const args = [...(selection.arguments ?? [])];
      let nextMultiplier = multiplier;
      if (listType(field.type)) {
        if (!field.args.some(arg => arg.name === "take")) return fail("A selected collection cannot be safely paginated");
        const takeArg = args.find(arg => arg.name.value === "take");
        if (takeArg && takeArg.value.kind !== Kind.INT) return fail("Collection limits must be integer literals");
        const take = pageInteger(takeArg?.value.kind === Kind.INT ? Number(takeArg.value.value) : undefined, 25, 1, PAGE_MAX);
        const skipArg = args.find(arg => arg.name.value === "skip");
        if (skipArg && skipArg.value.kind !== Kind.INT) return fail("Collection offsets must be integer literals");
        pageInteger(skipArg?.value.kind === Kind.INT ? Number(skipArg.value.value) : undefined, 0, 0, 10_000);
        nextMultiplier *= take;
        rows += nextMultiplier;
        if (rows > ROW_BUDGET) return fail("The selection exceeds the 500-row relationship fanout budget");
        if (!takeArg) args.push(intArgument("take", take));
        // Stable default order for collections exposing Keystone's ID sort.
        const order = field.args.find(arg => arg.name === "orderBy");
        const orderInput = order && getNamedType(order.type);
        const idOrder = orderInput && isInputObjectType(orderInput) && orderInput.getFields().id;
        const direction = idOrder && getNamedType(idOrder.type);
        if (!args.some(arg => arg.name.value === "orderBy") && direction && isEnumType(direction) && direction.getValues().some(value => value.name === "asc")) {
          const parsedOrder = parse("query { x(orderBy: [{ id: asc }]) }").definitions[0];
          if (parsedOrder.kind === Kind.OPERATION_DEFINITION) {
            const node = parsedOrder.selectionSet.selections[0];
            if (node.kind === Kind.FIELD && node.arguments) args.push(...node.arguments);
          }
        }
      }
      const named = getNamedType(field.type);
      if (selection.selectionSet && !isObjectType(named) && !isInterfaceType(named)) return fail("Abstract selections cannot be safely bounded");
      return { ...selection, arguments: args, ...(selection.selectionSet && (isObjectType(named) || isInterfaceType(named)) ? { selectionSet: bound(selection.selectionSet, named, nextMultiplier) } : {}) };
    }) };
  };
  let bounded = bound(definition.selectionSet, schema.getQueryType()!, 1);
  let variableDefinitions = definition.variableDefinitions;
  const validSearchFields: string[] = [];
  if (input.search !== undefined) {
    const term = input.search.trim();
    if (!term || term.length > 500) return fail("Search text must contain 1 to 500 characters");
    const whereArg = root.args.find(arg => arg.name === "where");
    const whereType = whereArg && getNamedType(whereArg.type);
    if (!whereArg || !whereType || !isInputObjectType(whereType) || !whereType.getFields().OR) return fail("This operation has no supported search filter");
    const conditions: Record<string, unknown>[] = [];
    for (const name of ["id", "name", "title", "label", "subject", "reference", "number", "claimNumber", "releaseNumber", "description", "email", "code"]) {
      const filter = whereType.getFields()[name];
      const filterType = filter && getNamedType(filter.type);
      if (!filterType || !isInputObjectType(filterType)) continue;
      const fields = filterType.getFields();
      if (name === "id" && fields.equals) { conditions.push({ id: { equals: term } }); validSearchFields.push(name); }
      else if (fields.contains) {
        const mode = fields.mode && getNamedType(fields.mode.type);
        conditions.push({ [name]: { contains: term, ...(mode && isEnumType(mode) && mode.getValues().some(value => value.name === "insensitive") ? { mode: "insensitive" } : {}) } });
        validSearchFields.push(name);
      }
    }
    if (!conditions.length) return fail("This model has no supported searchable fields");
    variables.where = { OR: conditions };
    const declaration = parse(`query McpRead($where: ${String(whereArg.type)}) { ${operation}(where: $where) { id } }`).definitions[0];
    if (declaration.kind !== Kind.OPERATION_DEFINITION) return fail("Search declaration is invalid");
    variableDefinitions = declaration.variableDefinitions;
    const template = declaration.selectionSet.selections[0];
    if (template.kind !== Kind.FIELD) return fail("Search selection is invalid");
    bounded = { ...bounded, selections: bounded.selections.map(selection => selection.kind === Kind.FIELD ? { ...selection, arguments: [...(selection.arguments ?? []), ...(template.arguments ?? [])] } : selection) };
  }
  const output = { ...document, definitions: [{ ...definition, variableDefinitions, selectionSet: bounded }] };
  if (validate(schema, output).length) return fail("The selection or arguments are not valid for the discovered schema");
  query = print(output);
  assertGraphQLQueryBudget(query);
  return { query, variables, operation, limit, skip, rowBound: rows, validSearchFields };
}

/** Count bytes before JSON decoding; do not forward a truncated success. */
export async function readBoundedGraphqlResult(response: Response, maxBytes = 1_048_576): Promise<unknown> {
  if (!response.ok) return fail("The authenticated GraphQL request failed");
  if (Number(response.headers.get("content-length")) > maxBytes) return fail("The GraphQL result exceeds the response budget");
  const reader = response.body?.getReader();
  if (!reader) return fail("The GraphQL response body is missing");
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) return fail("The GraphQL result exceeds the response budget");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { return fail("The GraphQL response was not valid JSON"); }
}
