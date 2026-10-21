import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getInternalGraphqlEndpoint } from './graphqlEndpoint';
import { buildBoundedReadQuery, resolveModelListOperation, readBoundedGraphqlResult, McpQueryPolicyError } from './query-policy';
import { 
  getIntrospectionQuery, 
  buildClientSchema, 
  GraphQLSchema,
  type GraphQLFormattedError,
  type GraphQLType,
  type IntrospectionQuery,
  isInterfaceType,
  isNonNullType,
  isListType,
  isObjectType,
  isInputObjectType,
} from 'graphql';

type GraphQLExecutionResult<TData = unknown> = {
  data?: TData;
  errors?: readonly GraphQLFormattedError[];
};

type ModelInfo = {
  typeName: string;
  description: string;
  kind: string;
  relatedOperations: string[];
};

type FieldArgumentInfo = {
  name: string;
  type: string;
  description: string | null;
  defaultValue: unknown;
};

type FieldInfo = {
  name: string;
  type: string;
  description: string | null;
  args?: FieldArgumentInfo[];
};

type InputFieldInfo = {
  name: string;
  type: string;
  description: string | null;
  required: boolean;
  defaultValue: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIntrospectionResult(value: unknown): value is IntrospectionQuery {
  return isRecord(value) && isRecord(value.__schema) && Array.isArray(value.__schema.types) &&
    isRecord(value.__schema.queryType) && typeof value.__schema.queryType.name === 'string';
}

export async function POST(request: Request, context: { params: Promise<{ transport: string }> }) {
  const response = await handlePost(request, context);
  if (!response.ok) return response;
  try {
    const body = await readBoundedGraphqlResult(response);
    return Response.json(body, { status: response.status });
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'MCP response exceeded its budget or was invalid' } }, { status: 413 });
  }
}

// Get simple type name for display
function getSimpleTypeName(type: GraphQLType): string {
  if (isNonNullType(type)) {
    return getSimpleTypeName(type.ofType);
  }
  if (isListType(type)) {
    return `[${getSimpleTypeName(type.ofType)}]`;
  }
  return type.name || type.toString();
}

// Execute GraphQL query with authentication
import { readBoundedObjectJson, RequestBudgetError } from '@/features/lib/bounded-json';

async function executeGraphQL(
  query: string,
  graphqlEndpoint: string,
  cookie: string,
  variables: Record<string, unknown> = {},
): Promise<GraphQLExecutionResult> {
  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });

  const result = await readBoundedGraphqlResult(response);
  if (!isRecord(result) || result.errors || !isRecord(result.data)) throw new Error('Authenticated GraphQL query failed');
  return { data: result.data };
}

// Get GraphQL schema from introspection
async function getGraphQLSchema(graphqlEndpoint: string, cookie: string): Promise<GraphQLSchema> {
  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
    signal: AbortSignal.timeout(15_000),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const result = await readBoundedGraphqlResult(response, 8 * 1_048_576);
  if (!isRecord(result)) throw new Error('GraphQL introspection returned an invalid envelope');
  if (result.errors) {
    throw new Error('GraphQL schema discovery failed');
  }
  if (!isIntrospectionResult(result.data)) throw new Error('GraphQL introspection returned no schema data');
  
  return buildClientSchema(result.data);
}

async function handlePost(request: Request, { params }: { params: Promise<{ transport: string }> }) {
  try {
    const { transport } = await params;
    if (transport !== 'http') {
      return Response.json({ error: 'Unsupported MCP transport' }, { status: 404 });
    }

    // Keep authenticated schema discovery and bounded reads on the request origin.
    const graphqlEndpoint = getInternalGraphqlEndpoint(request.url);
    
    // Extract cookie from request
    const cookie = request.headers.get('cookie') || ''
  
    // Reject oversized transport input before schema discovery or database work.
    const body = await readBoundedObjectJson(request);
    // Handshake/tool descriptions do not execute schema or data queries.
    
    // Handle the request based on method
    if (body.method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: true },
          },
          serverInfo: {
            name: 'simple-mcp-server',
            version: '1.0.0'
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (body.method === 'notifications/initialized') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {}
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (body.method === 'tools/list') {
      // Return tools
      const tools: Tool[] = [{
        name: 'listModels',
        description: 'List all available GraphQL models/types in the system',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }, {
        name: 'queryData',
        description: 'Read one bounded page from a discovered list operation. Nested lists require limits; total fanout is at most 500 rows. Pages are not complete reports.',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              description: 'The GraphQL operation name (e.g., "projects", "rfis", "roles")'
            },
            fields: {
              type: 'string',
              description: 'The fields to select; bound nested lists explicitly (e.g. "id lineItems(take: 5) { id }")'
            },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
            skip: { type: 'integer', minimum: 0, maximum: 10000, default: 0 }
          },
          required: ['operation', 'fields']
        }
      }, {
        name: 'searchModels',
        description: 'Search for models by name pattern',
        inputSchema: {
          type: 'object',
          properties: {
            searchTerm: {
              type: 'string',
              description: 'The search term to find models (e.g., "Project", "RFI", "Role")'
            }
          },
          required: ['searchTerm']
        }
      }, {
        name: 'getFieldsForType',
        description: 'Get all available fields for a specific GraphQL type',
        inputSchema: {
          type: 'object',
          properties: {
            typeName: {
              type: 'string',
              description: 'The GraphQL type name to get fields for (e.g., "Project", "RFI", "Role")'
            }
          },
          required: ['typeName']
        }
      }, {
        name: 'lookupInputType',
        description: 'Get the structure of a GraphQL input type for mutations',
        inputSchema: {
          type: 'object',
          properties: {
            inputTypeName: {
              type: 'string',
              description: 'The GraphQL input type name (e.g., "UserCreateInput", "RFIUpdateInput")'
            }
          },
          required: ['inputTypeName']
        }
      }, {
        name: 'modelSpecificSearch',
        description: 'Search a bounded page using the actual discovered model return type and typed filter variables. Results are not totals.',
        inputSchema: {
          type: 'object',
          properties: {
            modelName: {
              type: 'string',
              description: 'The exact model name (case-insensitive); the list operation is resolved by its schema return type.'
            },
            searchQuery: {
              type: 'string',
              description: 'The search term to find within the model. Supports both ID matching and text field searching with case-insensitive matching.'
            },
            fields: {
              type: 'string',
              description: 'The fields to return; nested lists must fit the relationship fanout budget.'
            },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
            skip: { type: 'integer', minimum: 0, maximum: 10000, default: 0 }
          },
          required: ['modelName', 'searchQuery', 'fields']
        }
      }];
      
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: { tools }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (body.method === 'tools/call') {
      // Handle tool call
      const { name, arguments: args } = body.params;

      try {
        const schema = await getGraphQLSchema(graphqlEndpoint, cookie);
        if (name === 'listModels') {
          const allModels: ModelInfo[] = [];
          
          // Get all types from schema
          const typeMap = schema.getTypeMap();
          
          for (const [typeName, type] of Object.entries(typeMap)) {
            // Skip built-in GraphQL types
            if (typeName.startsWith('__')) continue;
            
            // Find related operations for this type
            const relatedOps: string[] = [];
            
            // Check queries
            if (schema.getQueryType()) {
              const queryFields = schema.getQueryType()!.getFields();
              for (const [queryName] of Object.entries(queryFields)) {
                const baseTypeName = typeName.toLowerCase().replace(/input$|type$/i, '');
                if (queryName.toLowerCase().includes(baseTypeName) || 
                    queryName.toLowerCase() === baseTypeName + 's' ||
                    queryName.toLowerCase() === baseTypeName) {
                  relatedOps.push(`Query: ${queryName}`);
                }
              }
            }
            
            // Check mutations  
            if (schema.getMutationType()) {
              const mutationFields = schema.getMutationType()!.getFields();
              for (const [mutationName] of Object.entries(mutationFields)) {
                const baseTypeName = typeName.toLowerCase().replace(/input$|type$/i, '');
                if (mutationName.toLowerCase().includes(baseTypeName)) {
                  relatedOps.push(`Mutation: ${mutationName}`);
                }
              }
            }
            
            allModels.push({
              typeName,
              description: type.description || `GraphQL type: ${typeName}`,
              kind: type.constructor.name,
              relatedOperations: relatedOps
            });
          }
          
          // Sort by name
          allModels.sort((a, b) => a.typeName.localeCompare(b.typeName));
          
          const result = {
            totalModels: allModels.length,
            models: allModels
          };
          
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        if (name === 'queryData') {
          const plan = buildBoundedReadQuery(schema, args);
          const result = await executeGraphQL(plan.query, graphqlEndpoint, cookie, plan.variables);
          const items = isRecord(result.data) ? result.data[plan.operation] : undefined;
          return Response.json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify({
            results: result,
            page: { limit: plan.limit, skip: plan.skip, returnedCount: Array.isArray(items) ? items.length : 0, mayHaveMore: Array.isArray(items) && items.length === plan.limit, nextSkip: Array.isArray(items) && items.length === plan.limit ? plan.skip + plan.limit : null },
            completeness: 'Bounded page, not a complete report. Nested collections are also bounded.',
          }) }] } });
        }

        if (name === 'searchModels') {
          const { searchTerm } = args;
          const searchLower = searchTerm.toLowerCase();
          
          const matchingModels: ModelInfo[] = [];
          
          // Get all types from schema
          const typeMap = schema.getTypeMap();
          
          for (const [typeName, type] of Object.entries(typeMap)) {
            // Skip built-in GraphQL types
            if (typeName.startsWith('__')) continue;
            
            // Check if type name matches search term
            if (typeName.toLowerCase().includes(searchLower)) {
              // Find related operations for this type
              const relatedOps: string[] = [];
              
              // Check queries
              if (schema.getQueryType()) {
                const queryFields = schema.getQueryType()!.getFields();
                for (const [queryName] of Object.entries(queryFields)) {
                  const baseTypeName = typeName.toLowerCase().replace(/input$|type$/i, '');
                  if (queryName.toLowerCase().includes(baseTypeName) || 
                      queryName.toLowerCase() === baseTypeName + 's' ||
                      queryName.toLowerCase() === baseTypeName) {
                    relatedOps.push(`Query: ${queryName}`);
                  }
                }
              }
              
              // Check mutations  
              if (schema.getMutationType()) {
                const mutationFields = schema.getMutationType()!.getFields();
                for (const [mutationName] of Object.entries(mutationFields)) {
                  const baseTypeName = typeName.toLowerCase().replace(/input$|type$/i, '');
                  if (mutationName.toLowerCase().includes(baseTypeName)) {
                    relatedOps.push(`Mutation: ${mutationName}`);
                  }
                }
              }
              
              matchingModels.push({
                typeName,
                description: type.description || `GraphQL type: ${typeName}`,
                kind: type.constructor.name,
                relatedOperations: relatedOps
              });
            }
          }
          
          // Sort by name
          matchingModels.sort((a, b) => a.typeName.localeCompare(b.typeName));
          
          const result = {
            searchTerm,
            matchingModels: matchingModels.length,
            models: matchingModels
          };
          
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        if (name === 'getFieldsForType') {
          const { typeName } = args;
          
          // Get the specific type from schema
          const typeMap = schema.getTypeMap();
          const type = typeMap[typeName];
          
          if (!type) {
            return new Response(JSON.stringify({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    error: `Type '${typeName}' not found in schema`,
                    availableTypes: Object.keys(typeMap).filter(name => !name.startsWith('__'))
                  }, null, 2),
                }],
              }
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          
          const fields: FieldInfo[] = [];
          
          if (isObjectType(type) || isInterfaceType(type)) {
            for (const [fieldName, field] of Object.entries(type.getFields())) {
              fields.push({
                name: fieldName,
                type: getSimpleTypeName(field.type),
                description: field.description || null,
                ...(field.args.length > 0
                  ? {
                      args: field.args.map(arg => ({
                        name: arg.name,
                        type: getSimpleTypeName(arg.type),
                        description: arg.description || null,
                        defaultValue: arg.defaultValue,
                      })),
                    }
                  : {}),
              });
            }
          } else if (isInputObjectType(type)) {
            for (const [fieldName, field] of Object.entries(type.getFields())) {
              fields.push({
                name: fieldName,
                type: getSimpleTypeName(field.type),
                description: field.description || null,
              });
            }
          }
          
          const result = {
            typeName,
            typeKind: type.constructor.name,
            description: type.description || null,
            fields: fields
          };
          
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        if (name === 'lookupInputType') {
          const { inputTypeName } = args;
          
          // Get the specific input type from schema
          const typeMap = schema.getTypeMap();
          const inputType = typeMap[inputTypeName];
          
          if (!inputType) {
            return new Response(JSON.stringify({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    error: `Input type '${inputTypeName}' not found in schema`,
                    availableInputTypes: Object.keys(typeMap).filter(name => 
                      !name.startsWith('__') && name.toLowerCase().includes('input')
                    )
                  }, null, 2),
                }],
              }
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          
          const inputFields: InputFieldInfo[] = [];
          
          // Check if it's an input object type
          if (isInputObjectType(inputType)) {
            const fields = inputType.getFields();
            
            for (const [fieldName, field] of Object.entries(fields)) {
              const inputFieldInfo: InputFieldInfo = {
                name: fieldName,
                type: getSimpleTypeName(field.type),
                description: field.description || null,
                required: isNonNullType(field.type),
                defaultValue: field.defaultValue
              };
              
              inputFields.push(inputFieldInfo);
            }
          }
          
          const result = {
            inputTypeName,
            typeKind: inputType.constructor.name,
            description: inputType.description || null,
            fields: inputFields,
            isInputType: isInputObjectType(inputType)
          };
          
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        if (name === 'modelSpecificSearch') {
          if (typeof args.searchQuery !== 'string') throw new McpQueryPolicyError('Search text is required');
          const operation = resolveModelListOperation(schema, args.modelName);
          const plan = buildBoundedReadQuery(schema, { operation, fields: args.fields, limit: args.limit ?? 10, skip: args.skip, search: args.searchQuery });
          const result = await executeGraphQL(plan.query, graphqlEndpoint, cookie, plan.variables);
          const items = isRecord(result.data) ? result.data[operation] : undefined;
          return Response.json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify({
            operationName: operation, validSearchFields: plan.validSearchFields, results: result,
            page: { limit: plan.limit, skip: plan.skip, returnedCount: Array.isArray(items) ? items.length : 0, mayHaveMore: Array.isArray(items) && items.length === plan.limit, nextSkip: Array.isArray(items) && items.length === plan.limit ? plan.skip + plan.limit : null },
            completeness: 'Bounded search page, not a total. Nested collections are also bounded.',
          }) }] } });
        }

        throw new Error(`Tool ${name} not found`);
      } catch (error) {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            isError: true,
            content: [{
              type: 'text',
              text: error instanceof McpQueryPolicyError ? error.message : 'The MCP read could not be completed',
            }],
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        error: { code: -32601, message: 'Method not found' }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    if (error instanceof RequestBudgetError) return Response.json({ error: error.message }, { status: error.status });
    console.error('MCP transport request failed');
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Internal error'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ transport: string }> }) {
  const { transport } = await params;
  if (transport !== 'http') {
    return Response.json({ error: 'Unsupported MCP transport' }, { status: 404 });
  }

  const graphqlEndpoint = getInternalGraphqlEndpoint(request.url);
  
  return new Response(JSON.stringify({ 
    message: 'Simple MCP Server is running',
    transport: transport,
    graphqlEndpoint
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}