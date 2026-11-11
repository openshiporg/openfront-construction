// Crawl every dashboard + storefront page as each role; PASS/FAIL per page. 404 ids must be 404.
// Usage: CRAWL_BASE=http://localhost:3917 CRAWL_LOGINS=/path/logins.json node scripts/r6-crawl.mjs [roles...]
// CRAWL_LOGINS is a JSON file { "<role>": { "email": "...", "password": "..." } } kept outside the repo.
import fs from 'node:fs'
import { chromium } from '/Users/junaid/Code/vibeghost/vibeghost/node_modules/playwright/index.mjs'

const BASE = process.env.CRAWL_BASE
const people = JSON.parse(fs.readFileSync(process.env.CRAWL_LOGINS, 'utf8'))
const roles = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(people)

async function gql(query, cookie, variables) {
  const r = await fetch(BASE + '/api/graphql', { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ query, variables }) })
  return r.json()
}
const first = people[roles[0]]
const tok = (await gql('mutation($e:String!,$p:String!){authenticateUserWithPassword(email:$e,password:$p){... on UserAuthenticationWithPasswordSuccess{sessionToken}}}', null, { e: first.email, p: first.password })).data?.authenticateUserWithPassword?.sessionToken
if (!tok) { console.log('CHECK login: FAIL'); process.exit(1) }
const cookie = 'keystonejs-session=' + tok
const dr = await gql(`{projects(take:1){id} tradePartners(take:1){id} serviceRequests(take:1){id reference} constructionLeads(take:1){id} constructionOpportunities(take:1){id} intakeSubmissions(take:1){id publicReference} documents(take:1){id} agentActions(take:1){id}}`, cookie)
if (!dr.data) { console.log('CHECK id lookup: FAIL ' + JSON.stringify(dr.errors?.[0]?.message)); process.exit(1) }
const d = dr.data
const pid = d.projects[0]?.id
const dash = ['cost-codes', 'payment-providers', 'pipeline', 'pipeline/create', 'portfolio', 'projects', 'resources', 'service-requests', 'setup', 'store-settings', 'trade-partners']
const proj = ['', '/audit', '/billing', '/contracts', '/documents', '/execution', '/field', '/financials', '/preconstruction', '/procurement', '/quality-safety', '/reports', '/schedule', '/structure', '/team']
const paths = [
  ...dash.map(p => `/dashboard/platform/${p}`),
  ...(pid ? proj.map(p => `/dashboard/platform/projects/${pid}${p}`) : []),
  ...(d.tradePartners[0] ? [`/dashboard/platform/trade-partners/${d.tradePartners[0].id}`] : []),
  ...(d.constructionOpportunities[0] ? [`/dashboard/platform/pipeline/${d.constructionOpportunities[0].id}`] : []),
  ...(d.intakeSubmissions[0] ? [`/dashboard/platform/pipeline/requests/${d.intakeSubmissions[0].id}`] : []),
  ...['projects', 'trade-partners', 'service-requests', 'documents', 'agent-actions', 'idempotency-keys', 'users', 'companies'].map(l => `/dashboard/platform/${l}/nope123`),
  '/dashboard/platform/projects/nope123', '/dashboard/platform/trade-partners/nope123',
  ...(d.documents[0] ? [`/dashboard/documents/${d.documents[0].id}`] : []),
  ...(d.agentActions[0] ? [`/dashboard/agent-actions/${d.agentActions[0].id}`] : []),
  ...['projects', 'users', 'agent-actions', 'companies', 'documents'].map(l => `/dashboard/${l}`),
  '/dashboard/agent-actions/nope123', '/dashboard/projects/nope123',
  '/', '/services', '/projects', '/trade-partners', '/contact', '/privacy', '/start-a-project', '/estimate', '/bid', '/rfp', '/client-intake', '/account', '/portal',
  '/projects/nope123', '/services/nope123', ...(d.intakeSubmissions[0]?.publicReference ? [`/requests/${d.intakeSubmissions[0].publicReference}/confirmation`] : []), '/requests/nope123/confirmation',
]
if (process.env.CRAWL_ONLY) { const keep = new RegExp(process.env.CRAWL_ONLY); for (let i = paths.length - 1; i >= 0; i--) if (!keep.test(paths[i])) paths.splice(i, 1) }
const is404 = p => /nope123/.test(p)
const b = await chromium.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
let bad = 0, n = 0
for (const role of roles) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true })
  const p = await ctx.newPage()
  await p.goto(BASE + '/dashboard/signin')
  await p.fill('input[name=email]', people[role].email)
  await p.fill('input[name=password]', people[role].password)
  await Promise.all([p.waitForURL(u => !u.pathname.includes('signin'), { timeout: 30000 }), p.click('button[type=submit]')])
  for (const path of paths) {
    const r = await p.goto(BASE + path, { waitUntil: 'load', timeout: 120000 }).catch(e => { console.log("ERR", String(e).slice(0,120)); return null })
    const txt = await p.evaluate(() => document.body.innerText).catch(() => '')
    const http = r?.status() ?? 0
    const broken = /this page could not be loaded|something went wrong|application error|internal server error/i.test(txt)
    const denied = role !== 'owner' && /access denied/i.test(txt)
    const ok = is404(path) ? (http === 404 || denied) : (http === 200 && !broken)
    n++; if (!ok) bad++
    console.log(`CHECK ${role} ${path}: ${ok ? 'PASS' : 'FAIL'} (${http}${is404(path) ? ' expected 404' : ''}${broken ? ' broken-text' : ''})`)
  }
  await ctx.close()
}
await b.close()
console.log(`CHECK all pages: ${bad ? 'FAIL' : 'PASS'} (${n} loads, ${bad} failed)`)
