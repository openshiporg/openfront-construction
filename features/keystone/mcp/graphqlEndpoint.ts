export type RuntimeEnvironment = {
  PORT?: string
  PORTLESS_URL?: string
  APP_URL?: string
}

/**
 * Keep production GraphQL calls on the request origin. Portless is the one
 * exception: its HTTPS hostname maps to a local plain-HTTP Next.js target, so
 * an in-process HTTPS fetch would otherwise hit the target with the wrong TLS
 * protocol. The loopback mapping is enabled only when the trusted launch-time
 * PORTLESS_URL exactly matches the incoming origin.
 */
export function getTrustedInternalEndpoint(
  requestUrl: string,
  pathname: string,
  environment: RuntimeEnvironment = {
    PORT: process.env.PORT,
    PORTLESS_URL: process.env.PORTLESS_URL,
    APP_URL: process.env.APP_URL,
  },
): string {
  const externalEndpoint = new URL(pathname, requestUrl)
  const { PORT: port, PORTLESS_URL: portlessUrl, APP_URL: appUrl } = environment
  const configuredUrl = portlessUrl || appUrl
  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(externalEndpoint.hostname)
  if (!configuredUrl) {
    if (isLoopback) return externalEndpoint.href
    throw new Error('APP_URL or PORTLESS_URL is required for authenticated internal GraphQL forwarding')
  }

  let configuredOrigin: string
  try {
    configuredOrigin = new URL(configuredUrl).origin
  } catch {
    throw new Error('Configured application URL is invalid')
  }
  if (externalEndpoint.origin !== configuredOrigin && !isLoopback) {
    throw new Error('Untrusted request origin')
  }

  if (portlessUrl && port && /^\d{1,5}$/.test(port)) {
    const portNumber = Number(port)
    if (portNumber >= 1 && portNumber <= 65_535) {
      const isPortlessLoopbackTarget = isLoopback && Number(externalEndpoint.port) === portNumber
      if (externalEndpoint.origin === configuredOrigin || isPortlessLoopbackTarget) {
        return new URL(pathname, `http://127.0.0.1:${portNumber}`).href
      }
    }
  }
  if (externalEndpoint.origin !== configuredOrigin) throw new Error('Untrusted request origin')
  return new URL(pathname, configuredOrigin).href
}

export function getInternalGraphqlEndpoint(
  requestUrl: string,
  environment?: RuntimeEnvironment,
): string {
  return getTrustedInternalEndpoint(requestUrl, '/api/graphql', environment)
}
