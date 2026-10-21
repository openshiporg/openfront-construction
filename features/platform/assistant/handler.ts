import { convertToModelMessages, streamText, stepCountIs } from 'ai';
import { createMCPClient, type MCPClient } from '@ai-sdk/mcp';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { getTrustedInternalEndpoint } from '@/features/keystone/mcp/graphqlEndpoint';
import { createScopedMcpFetch } from './scopedMcpFetch';
import { publicAssistantFailure, reportAssistantFailure } from './diagnostics';
import { readBoundedObjectJson, RequestBudgetError } from '@/features/lib/bounded-json';

export async function POST(req: Request) {
  let mcpClient: MCPClient | null = null;

  try {
    const body = await readBoundedObjectJson(req);
    let messages = body.messages || [];
    const prompt = body.prompt || body.messages?.[body.messages.length - 1]?.content || '';

    const MAX_MESSAGES = 20;
    if (messages.length > MAX_MESSAGES) {
      messages = messages.slice(-MAX_MESSAGES);
    }

    if (!body.useLocalKeys || !body.apiKey) {
      return new Response(JSON.stringify({
        error: 'API key is required',
        details: 'API key must be provided in request body'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = body.apiKey;
    const baseURL = 'https://openrouter.ai/api/v1';

    if (!body.model) {
      return new Response(JSON.stringify({
        error: 'Model is required',
        details: 'Model must be provided in request body'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const model = body.model;
    const maxTokens = body.maxTokens ? parseInt(body.maxTokens) : undefined;

    // Request values and provider diagnostics must never be logged.

    try {
      const testResponse = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });
      await testResponse.body?.cancel().catch(() => {});

      if (!testResponse.ok) {
        reportAssistantFailure('PROVIDER_VALIDATION_FAILED');
        const errorMessage = 'The API key could not be validated';

        return new Response(JSON.stringify({
          error: 'Authentication Error',
          details: errorMessage
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch {
      reportAssistantFailure('PROVIDER_UNAVAILABLE');
      return new Response(JSON.stringify({
        error: 'Authentication Error',
        details: 'Failed to validate API key'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const mcpEndpoint = new URL(getTrustedInternalEndpoint(req.url, '/api/mcp-transport/http'));
    const cookie = req.headers.get('cookie') || '';

    const transport = new StreamableHTTPClientTransport(mcpEndpoint, {
      fetch: createScopedMcpFetch(mcpEndpoint, cookie),
    });
    mcpClient = await createMCPClient({ transport });
    const activeMcpClient = mcpClient;
    const aiTools = await activeMcpClient.tools();

    const systemInstructions = `You're an expert at converting natural language to GraphQL queries for our KeystoneJS API.

YOUR CAPABILITY BOUNDARY:
This assistant is read-only. It can inspect schema and query bounded project data, but it cannot execute create, update, delete, approval, payment, invitation, or other mutation operations. Never describe a proposed operation as completed.

HANDLING MODEL IDENTIFICATION:
Generally, users will say the model name directly ("RFI", "commitment", "project"). However, they might use synonyms, typos, or related terms ("subcontract" instead of "commitment", "pay application" instead of "progress claim"). In these cases, use searchModels to find the correct model that matches their intent.

YOUR TOOLS:
Available tools are listModels, searchModels, getFieldsForType, lookupInputType, queryData, and modelSpecificSearch. Use only those tools. There are no createData, updateData, deleteData, or arbitrary mutation tools.

ENHANCED SEARCH CAPABILITY:
You now have access to a modelSpecificSearch tool that provides intelligent search functionality similar to the dashboard. This tool:
- Automatically finds the correct model and GraphQL operation
- Performs case-insensitive searching across common text fields (name, title, description, etc.)
- Supports ID-based exact matching
- Uses the same search logic as the dashboard for consistent results

For requested changes, inspect the record only if needed, explain the supported next step, and direct the user to the authorized dashboard workflow. Never recommend generic Keystone CRUD as a bypass for controlled construction commands.

WORKFLOW for any data request:
1. Use searchModels to find the right model/operation
2. Use getFieldsForType to discover available fields
3. For relationship fields, ALSO use getFieldsForType on the related type to see what fields are available
4. Use queryData with the discovered operation and relevant fields (including sub-selections for relationships)

WORKFLOW for searching specific data:
1. If the user wants to search for specific items (e.g., "find product with name X", "search for users containing Y"), use modelSpecificSearch directly
2. This tool handles model discovery, operation mapping, and intelligent searching automatically
3. It returns actual search results, not just schema information

WORKFLOW for requested data changes (read-only only):
1. Identify the model from user's natural language (use searchModels if unclear)
2. Apply Keystone transformation rules to get operation names
3. Use lookupInputType to get exact field structure if needed
4. No mutation tool exists; direct the user to the authorized dashboard workflow.

WORKFLOW for updates (read-only only):
1. Identify the model from user's natural language (use searchModels if unclear)
2. Apply Keystone transformation rules to get operation names (update{Model})
3. Use lookupInputType to get exact field structure for {Model}UpdateInput if needed
4. No mutation tool exists; direct the user to the authorized dashboard workflow.

WORKFLOW for deletes (read-only only):
1. Identify the model from user's natural language (use searchModels if unclear)
2. Apply Keystone transformation rules to get operation names (delete{Model})
3. No mutation tool exists; direct the user to the authorized dashboard workflow.

RELATIONSHIP HANDLING:
- If getFieldsForType shows a relationship field (like "productVariants" on Product), also call getFieldsForType("ProductVariant") 
- Include relationships with sub-selections: fields="id title productVariants { id name price }"
- For single relationships: fields="id name user { email name }"
- For list relationships: fields="id title variants { id name price }"

EXAMPLES:
- "List all widgets" → searchModels("widget") → getFieldsForType("Widget") → queryData(operation="widgets", fields="id name")
- "Show all gadgets" → searchModels("gadget") → getFieldsForType("Gadget") → queryData(operation="gadgets", fields="id title")
- "Find products with name Penrose" → modelSpecificSearch(modelName="Product", searchQuery="Penrose", fields="id name description")
- "Search for users with email john" → modelSpecificSearch(modelName="User", searchQuery="john", fields="id name email")
- "Find RFIs containing storefront" → modelSpecificSearch(modelName="RFI", searchQuery="storefront", fields="id number subject status")





For a mutation request, clearly say it was not performed and direct the user to an authorized dashboard workflow. Return actual read results with concise provenance and distinguish bounded samples from complete reports.`;

    const openrouter = createOpenRouter({ apiKey, baseURL });

    const inputMessages = messages.length > 0
      ? messages
      : [{ id: `prompt-${Date.now()}`, role: 'user', parts: [{ type: 'text', text: prompt }] }];

    const result = streamText({
      model: openrouter(model),
      tools: aiTools,
      messages: await convertToModelMessages(inputMessages),
      system: systemInstructions,
      stopWhen: stepCountIs(10),
      ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
      onFinish: async () => {
        try { await activeMcpClient.close(); } catch { reportAssistantFailure('CLOSE_FAILED'); }
      },
      onError: async () => {
        reportAssistantFailure('STREAM_FAILED');
        try { await activeMcpClient.close(); } catch { reportAssistantFailure('CLOSE_FAILED'); }
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: inputMessages,
      onError: publicAssistantFailure,
    });
  } catch (error) {
    if (error instanceof RequestBudgetError) return Response.json({ error: error.message }, { status: error.status });
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch {}
    }

    console.error('Completion request failed'); // SDK errors can contain caller credentials/prompt data.

    return new Response(JSON.stringify({
      error: 'Internal Server Error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
