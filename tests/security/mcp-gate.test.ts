import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { getInternalGraphqlEndpoint } from '../../features/keystone/mcp/graphqlEndpoint'

const root = path.resolve(__dirname, '../..')
const handler = fs.readFileSync(path.join(root, 'features/keystone/mcp/handler.ts'), 'utf8')
const gate = fs.readFileSync(path.join(root, 'features/keystone/mcpGate.ts'), 'utf8')

test('MCP refuses anonymous callers before the handshake, tool list, schema or data', () => {
  const refuse = handler.indexOf('const refused = await requireMcpSession(request, body);')
  assert.ok(refuse > 0, 'gate present')
  for (const marker of ["body.method === 'initialize'", "body.method === 'tools/list'", "body.method === 'tools/call'"]) {
    assert.ok(handler.indexOf(marker) > refuse, `${marker} comes after the gate`)
  }
  assert.match(handler, /if \(refused\) return refused;/)
  assert.match(gate, /signedIn = Boolean\(context\.session\?\.itemId\)/)
  assert.match(gate, /status: 401/)
  assert.match(gate, /Sign in required/)
})

test('tool calls read the served schema in-process, never by HTTP introspection', () => {
  assert.match(handler, /const schema = keystoneContext\.graphql\.schema;/)
  assert.doesNotMatch(handler, /await getGraphQLSchema\(/)
})

test('without APP_URL the self-call uses 127.0.0.1:PORT, not the request\'s localhost origin', () => {
  assert.equal(getInternalGraphqlEndpoint('http://localhost:8080/api/mcp-transport/http', { PORT: '8080' }), 'http://127.0.0.1:8080/api/graphql')
  assert.equal(getInternalGraphqlEndpoint('http://localhost:3000/api/mcp-transport/http', {}), 'http://localhost:3000/api/graphql')
  assert.throws(() => getInternalGraphqlEndpoint('https://evil.example/api/mcp-transport/http', { PORT: '8080' }), /APP_URL or PORTLESS_URL/)
})
