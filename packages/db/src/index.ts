import 'server-only'

import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

const useNeon = process.env.VERCEL === '1' || process.env.DRIZZLE_DRIVER === 'neon'

export const db = useNeon ? drizzleNeon(url, { schema }) : drizzleNode(url, { schema })

export * from './schema'
