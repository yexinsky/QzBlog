import NextAuth, { NextAuthOptions, User } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      avatarUrl?: string;
      role: string;
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          username: profile.login,
          email: profile.email,
          avatarUrl: profile.avatar_url,
          role: 'admin',
        };
      },
    }),
    // 本地管理员账号（通过环境变量创建，仅用于初始设置）
    CredentialsProvider({
      name: 'Admin',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // 检查环境变量中的管理员凭据
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (adminUsername && adminPassword) {
          if (
            credentials.username === adminUsername &&
            credentials.password === adminPassword
          ) {
            // 查找或创建管理员用户
            let user = await db.query.users.findFirst({
              where: eq(users.username, adminUsername),
            });

            if (!user) {
              // 创建管理员用户
              const newUser = await db
                .insert(users)
                .values({
                  username: adminUsername,
                  email: `${adminUsername}@localhost`,
                  role: 'admin',
                })
                .returning();

              if (newUser.length > 0) {
                return {
                  id: newUser[0].id,
                  username: newUser[0].username,
                  email: newUser[0].email,
                  role: newUser[0].role,
                  avatarUrl: newUser[0].avatarUrl || undefined,
                };
              }
            }

            if (user) {
              return {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl || undefined,
              };
            }
          }
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };