import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),

  /**
   * ======================================================
   * CUSTOM AUTH PAGES
   * ======================================================
   * ⛔ disable default /api/auth/signin
   * ✅ redirect to /login instead
   */
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/login',
  },

  /**
   * ======================================================
   * SESSION
   * ======================================================
   */
  session: {
    strategy: 'jwt',
  },

  /**
   * ======================================================
   * PROVIDERS
   * ======================================================
   */
  providers: [
    /**
     * ===== GitHub OAuth =====
     */
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),

    /**
     * ===== Demo Login (Email Only) =====
     */
    Credentials({
      name: 'Demo Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],

  /**
   * ======================================================
   * CALLBACKS
   * ======================================================
   */
  callbacks: {
    /**
     * JWT
     * - simpan id & role
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
      }

      if (token.email && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
        }
      }

      return token
    },

    /**
     * SESSION
     * - expose id & role
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },

    /**
     * SIGN IN
     * - allow / deny only
     */
    async signIn({ user }) {
      return !!user
    },
  },

  /**
   * ======================================================
   * EVENTS — AUDIT TRAIL (LOGIN)
   * ======================================================
   */
  events: {
    async signIn({ user, account }) {
      if (!user?.id) return

      try {
        await prisma.auditLog.create({
          data: {
            actorId: user.id as string,
            actorRole: (user as any).role,
            action: 'LOGIN_SUCCESS',
            entity: 'AUTH',
            entityId: user.id as string,
            meta: {
              provider: account?.provider,
              email: user.email,
            },
          },
        })
      } catch (err) {
        // ❗ audit tidak boleh bikin login gagal
        console.error('[AUDIT LOGIN ERROR]', err)
      }
    },
  },
})
