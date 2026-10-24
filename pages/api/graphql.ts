import { type NextApiRequest, type NextApiResponse } from "next";
import { createYoga } from "graphql-yoga";
import { assertGraphQLQueryBudget } from "../../features/keystone/domain/graphql-query-budget";
export { assertGraphQLQueryBudget } from "../../features/keystone/domain/graphql-query-budget";

import { keystoneContext } from "../../features/keystone/context";

export const config = {
  api: { bodyParser: false },
};

import { parseBoundedObjectJson } from "../../features/lib/bounded-json";
import { maskConstructionError } from "../../features/lib/graphql-error-mask";

const yoga = createYoga({
  graphiql: process.env.NODE_ENV !== "production",
  renderGraphiQL: () => `
    <!DOCTYPE html>
    <html lang="en">
      <body style="margin: 0; overflow-x: hidden; overflow-y: hidden">
        <div id="sandbox" style="height:100vh; width:100vw"></div>
        <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
        <script>
          new window.EmbeddedSandbox({ target: "#sandbox", initialEndpoint: window.location.href, hideCookieToggle: false, initialState: { includeCookies: true } });
        </script>
      </body>
    </html>`,
  graphqlEndpoint: "/api/graphql",
  schema: keystoneContext.graphql.schema,
  context: ({ req, res }: { req: NextApiRequest; res: NextApiResponse }) =>
    keystoneContext.withRequest(req, res),
  multipart: false,
  maskedErrors: { maskError: maskConstructionError },
});

async function readBoundedJsonBody(req: NextApiRequest): Promise<Record<string, unknown>> {
  const contentType = String(req.headers["content-type"] ?? "").toLowerCase();
  if (contentType.startsWith("multipart/form-data")) throw Object.assign(new Error("GraphQL multipart uploads are disabled; use the controlled signed-upload workflow"), { status: 415 });
  if (!contentType.includes("application/json")) throw Object.assign(new Error("GraphQL POST requests must use application/json"), { status: 415 });

  const length = req.headers["content-length"];
  const parsed = await parseBoundedObjectJson(req, typeof length === "string" ? length : undefined);
  req.body = parsed;
  return parsed as Record<string, unknown>;
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "POST") {
      const body = await readBoundedJsonBody(req);
      assertGraphQLQueryBudget(body.query);
    } else if (req.method === "GET") {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.searchParams.has("query")) assertGraphQLQueryBudget(url.searchParams.get("query"));
    } else if (req.method !== "OPTIONS") {
      res.setHeader("Allow", "GET, POST, OPTIONS");
      return res.status(405).json({ errors: [{ message: "Method not allowed" }] });
    }
    return yoga(req, res);
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
      ? error.status
      : 400;
    const message = error instanceof Error ? error.message : "GraphQL request rejected";
    return res.status(status).json({ errors: [{ message }] });
  }
}
