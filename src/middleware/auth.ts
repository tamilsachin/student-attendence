import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // 1. Check if token is a demo session token format
    if (token.startsWith('demo_token_')) {
      const email = Buffer.from(token.replace('demo_token_', ''), 'base64').toString('utf-8');
      const dbUsers = await db.select().from(users).where(eq(users.email, email));
      if (dbUsers.length > 0) {
        const u = dbUsers[0];
        req.user = {
          id: u.id,
          uid: u.uid,
          email: u.email,
          name: u.name,
          role: u.role as 'admin' | 'teacher' | 'student',
          phone: u.phone,
          avatarUrl: u.avatarUrl,
        };
        return next();
      }
    }

    // 2. Otherwise verify via Firebase Admin
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      let dbUsers = await db.select().from(users).where(eq(users.uid, decodedToken.uid));
      
      if (dbUsers.length === 0 && decodedToken.email) {
        dbUsers = await db.select().from(users).where(eq(users.email, decodedToken.email));
      }

      if (dbUsers.length === 0) {
        // Auto-provision user in Cloud SQL
        const inserted = await db.insert(users).values({
          uid: decodedToken.uid,
          email: decodedToken.email || `user_${decodedToken.uid}@apex.edu`,
          name: decodedToken.name || 'Campus Member',
          role: 'student', // default role
        }).returning();
        dbUsers = inserted;
      }

      const u = dbUsers[0];
      req.user = {
        id: u.id,
        uid: u.uid,
        email: u.email,
        name: u.name,
        role: u.role as 'admin' | 'teacher' | 'student',
        phone: u.phone,
        avatarUrl: u.avatarUrl,
      };
      return next();
    } catch (fbError) {
      console.warn('Firebase token verification failed, checking alternate format:', fbError);
      return res.status(401).json({ error: 'Unauthorized: Invalid authentication token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized: Session could not be validated' });
  }
};

export const requireRole = (allowedRoles: Array<'admin' | 'teacher' | 'student'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Forbidden: Access restricted to ${allowedRoles.join(' or ')}` 
      });
    }
    next();
  };
};
