import { GraphQLError, Kind, getIntrospectionQuery, parse, stripIgnoredCharacters, type SelectionSetNode } from "graphql";

const MAX_QUERY_CHARACTERS = 50_000;
const MAX_QUERY_DEPTH = 12;
const MAX_QUERY_FIELDS = 500;
const discoveryDocument = stripIgnoredCharacters(getIntrospectionQuery());

/** Only the exact installed discovery document gets the depth it requires.
 * A name, alias, extra data field, variable or fragment cannot opt into it. */
export function assertGraphQLQueryBudget(query: unknown) {
  if (typeof query !== "string" || !query.trim()) throw new GraphQLError("A GraphQL query string is required");
  if (query.length > MAX_QUERY_CHARACTERS) throw new GraphQLError("GraphQL query exceeds the configured size limit");
  const document = parse(query);
  const maximumDepth = stripIgnoredCharacters(query) === discoveryDocument ? 16 : MAX_QUERY_DEPTH;
  const fragments = new Map(document.definitions.filter(definition => definition.kind === Kind.FRAGMENT_DEFINITION).map(definition => [definition.name.value, definition]));
  let fieldCount = 0;
  let deepest = 0;
  const visitSelectionSet = (selectionSet: SelectionSetNode, parentDepth: number, fragmentPath: Set<string>) => {
    for (const selection of selectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        fieldCount += 1;
        const depth = parentDepth + 1;
        deepest = Math.max(deepest, depth);
        if (fieldCount > MAX_QUERY_FIELDS) throw new GraphQLError(`GraphQL query exceeds the ${MAX_QUERY_FIELDS}-field limit`);
        if (depth > maximumDepth) throw new GraphQLError(`GraphQL query exceeds the ${maximumDepth}-level depth limit`);
        if (selection.selectionSet) visitSelectionSet(selection.selectionSet, depth, fragmentPath);
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        visitSelectionSet(selection.selectionSet, parentDepth, fragmentPath);
      } else {
        const fragmentName = selection.name.value;
        const fragment = fragments.get(fragmentName);
        if (fragment && !fragmentPath.has(fragmentName)) {
          const nextPath = new Set(fragmentPath); nextPath.add(fragmentName);
          visitSelectionSet(fragment.selectionSet, parentDepth, nextPath);
        }
      }
      if (fieldCount > MAX_QUERY_FIELDS) throw new GraphQLError(`GraphQL query exceeds the ${MAX_QUERY_FIELDS}-field limit`);
      if (deepest > maximumDepth) throw new GraphQLError(`GraphQL query exceeds the ${maximumDepth}-level depth limit`);
    }
  };
  for (const definition of document.definitions) {
    if (definition.kind === Kind.OPERATION_DEFINITION) visitSelectionSet(definition.selectionSet, 0, new Set());
  }
}
