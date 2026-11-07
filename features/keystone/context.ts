import { getContext } from '@keystone-6/core/context'
import * as PrismaModule from '@prisma/client'

import config from './index'

function createKeystoneContext() {
  return getContext(config, PrismaModule)
}

export type ConstructionContext = ReturnType<typeof createKeystoneContext>

declare global {
  var __openfrontKeystoneContext: ConstructionContext | undefined
}

// Avoid creating multiple Prisma clients during development hot reloads.
export const keystoneContext: ConstructionContext =
  globalThis.__openfrontKeystoneContext ?? createKeystoneContext()

// Next evaluates this module in several server layers; keep one context (one Prisma pool) per Node process.
globalThis.__openfrontKeystoneContext = keystoneContext
