import { type Request, type Response as ExpressResponse, type NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { logger } from '../lib/logger.js'
import jwt from 'jsonwebtoken'

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || ''
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

export interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string; role: string; supabaseId: string }
  authError?: string
}

async function verifyToken(token: string): Promise<{ sub: string; email: string; user_metadata?: any } | null> {
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const baseUrl = supabaseUrl.replace(/\/$/, '');
      const fetchRes = await fetch(`${baseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
      })
      if (fetchRes.ok) {
        const u = await fetchRes.json() as any
        if (u?.id) return { sub: u.id, email: u.email || '', user_metadata: u.user_metadata }
      }
    } catch (e: any) {
      logger.error({ err: e.message }, 'Supabase API failed')
    }
  }
  if (SUPABASE_JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as any
      if (decoded?.sub) return { sub: decoded.sub, email: decoded.email || '', user_metadata: decoded.user_metadata }
    } catch (e: any) {
      logger.error({ err: e.message }, 'JWT failed')
    }
  }
  return null
}

export const authMiddleware = async (req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'] as string | undefined
  if (!authHeader?.startsWith('Bearer ')) { next(); return }
  const token = authHeader.split(' ')[1]
  try {
    const verified = await verifyToken(token)
    if (!verified?.sub) { next(); return }
    const email = verified.email || ''
    let user = await prisma.users.findUnique({ where: { email } })
    if (!user) {
      const name = verified.user_metadata?.full_name || email.split('@')[0]
      user = await prisma.users.create({ data: { email, name, role: email === '2pack25rap@gmail.com' ? 'admin' : 'user', password: '' } })
    }
    req.user = { id: user.id, email: user.email, role: user.role, supabaseId: verified.sub }
  } catch (err: any) {
    req.authError = err.message
  }
  next()
}

export function requireAuth(req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction): void {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }
  next()
}

export function requireAdmin(req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return }
  next()
}
