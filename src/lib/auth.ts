import NextAuth, { type NextAuthOptions, type User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import { timingSafeEqual } from 'crypto';
import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from 'jose';
import { db } from './db';
import { users } from '../db/schema';
import { and, eq, or } from 'drizzle-orm';
import { loginRatelimit } from './rate-limit';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  role: string;
  type: 'access';
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

const textEncoder = new TextEncoder();

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('your-')) {
    throw new Error('[auth] AUTH_TOKEN_SECRET/NEXTAUTH_SECRET must be a non-placeholder value of at least 32 characters');
  }
  return textEncoder.encode(secret);
}

export async function generateAccessToken(user: { id: string; role: string }): Promise<string> {
  return new SignJWT({ role: user.role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function generateRefreshToken(user: { id: string }): Promise<string> {
  return new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

async function verifyToken<T extends AccessTokenPayload | RefreshTokenPayload>(
  token: string,
  expectedType: T['type']
): Promise<T | null> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });
    if (protectedHeader.typ !== 'JWT' || payload.type !== expectedType ||
        typeof payload.sub !== 'string' || typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number') return null;
    if (expectedType === 'access' && typeof payload.role !== 'string') return null;
    return payload as T;
  } catch {
    return null;
  }
}

export const verifyAccessToken = (token: string) =>
  verifyToken<AccessTokenPayload>(token, 'access');
export const verifyRefreshToken = (token: string) =>
  verifyToken<RefreshTokenPayload>(token, 'refresh');

export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    return typeof payload.exp !== 'number' || Date.now() / 1000 >= payload.exp;
  } catch {
    return true;
  }
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function resolveGithubCredentials(): { clientId: string; clientSecret: string } | null {
  if (process.env.ENABLE_GITHUB_AUTH !== 'true') return null;
  const clientId = process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID || '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET || '';
  if (!clientId || !clientSecret || clientId.startsWith('your-') || clientSecret.startsWith('your-')) return null;
  return { clientId, clientSecret };
}

async function existingUserByGithubProfile(profile: { id?: number | string; login?: string; email?: string | null }) {
  const githubId = profile.id == null ? '' : String(profile.id);
  if (!githubId) return null;
  return db.query.users.findFirst({ where: eq(users.githubId, githubId) });
}

async function refreshUserFromDatabase(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

function toAuthUser(user: typeof users.$inferSelect): User {
  return {
    id: user.id,
    username: user.username,
    name: user.username,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || undefined,
    image: user.avatarUrl || undefined,
  };
}

declare module 'next-auth' {
  interface Session {
    user: { id: string; username: string; email: string; avatarUrl?: string; role: string };
  }
  interface User {
    id: string; username: string; email: string; avatarUrl?: string; role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT { id?: string; username?: string; role?: string; }
}

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'Admin',
    credentials: {
      username: { label: 'Username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials, request): Promise<User | null> {
      const username = normalizeUsername(credentials?.username || '');
      const password = credentials?.password || '';
      if (!username || !password || username.length > 50 || password.length > 1024) return null;

      // NextAuth does not expose NextRequest here. Trust an IP header only when the deployment
      // explicitly opts in after configuring its reverse proxy to overwrite that header.
      const headers = request?.headers as Record<string, string | string[] | undefined> | undefined;
      const trustedHeader = process.env.AUTH_TRUST_PROXY === 'true'
        ? (headers?.['x-real-ip'] || headers?.['x-forwarded-for'])
        : undefined;
      const rawIp = Array.isArray(trustedHeader) ? trustedHeader[0] : trustedHeader;
      const ip = rawIp?.split(',')[0]?.trim() || 'untrusted-client';
      const limit = await loginRatelimit.limit(`${ip}:${username}`);
      if (!limit.success) return null;

      const configuredUsername = normalizeUsername(process.env.ADMIN_USERNAME || '');
      const configuredPassword = process.env.ADMIN_PASSWORD || '';
      if (!configuredUsername || !configuredPassword ||
          !safeEqual(username, configuredUsername) || !safeEqual(password, configuredPassword)) return null;

      // Login only: never create a user. The account must already exist in the database.
      const user = await db.query.users.findFirst({
        where: or(eq(users.username, username), eq(users.email, username)),
      });
      return user ? toAuthUser(user) : null;
    },
  }),
];

const githubCredentials = resolveGithubCredentials();
if (githubCredentials) {
  providers.push(GitHubProvider({
    clientId: githubCredentials.clientId,
    clientSecret: githubCredentials.clientSecret,
    profile(profile) {
      return {
        id: String(profile.id),
        username: profile.login,
        name: profile.login,
        email: profile.email || '',
        avatarUrl: profile.avatar_url,
        image: profile.avatar_url,
        role: 'author', // ignored; callbacks always reload role from the database
      };
    },
  }));
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/console/login', error: '/console/login' },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'github') return true;
      if (process.env.ENABLE_GITHUB_AUTH !== 'true' || !profile) return false;
      return Boolean(await existingUserByGithubProfile(profile as { id?: number | string; login?: string; email?: string | null }));
    },
    async jwt({ token, user, account }) {
      let databaseUser = user?.id ? await refreshUserFromDatabase(user.id) : null;
      if (!databaseUser && account?.provider === 'github' && account.providerAccountId) {
        databaseUser = await db.query.users.findFirst({ where: eq(users.githubId, account.providerAccountId) });
      }
      if (!databaseUser && token.id) databaseUser = await refreshUserFromDatabase(token.id);
      if (!databaseUser) {
        delete token.id; delete token.username; delete token.role;
        return token;
      }
      token.id = databaseUser.id;
      token.sub = databaseUser.id;
      token.username = databaseUser.username;
      token.role = databaseUser.role;
      token.email = databaseUser.email;
      token.picture = databaseUser.avatarUrl;
      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token.id) return session;
      const databaseUser = await refreshUserFromDatabase(token.id);
      if (!databaseUser) return { ...session, user: undefined } as unknown as typeof session;
      session.user.id = databaseUser.id;
      session.user.username = databaseUser.username;
      session.user.email = databaseUser.email;
      session.user.role = databaseUser.role;
      session.user.avatarUrl = databaseUser.avatarUrl || undefined;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return `${baseUrl}${url}`;
      try { return new URL(url).origin === baseUrl ? url : `${baseUrl}/console`; }
      catch { return `${baseUrl}/console`; }
    },
  },
};

export const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
