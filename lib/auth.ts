import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthConfig } from "next-auth";

// 1️⃣ Simpan config saja (AMAN di build)
const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Credentials({
      name: "Demo Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }

      if (token.email && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },

    async signIn({ user }) {
      return !!user;
    },
  },

  events: {
    async signIn({ user, account }) {
      if (!user?.id) return;

      try {
        await prisma.auditLog.create({
          data: {
            actorId: user.id as string,
            actorRole: (user as any).role,
            action: "LOGIN_SUCCESS",
            entity: "AUTH",
            entityId: user.id as string,
            meta: {
              provider: account?.provider,
              email: user.email,
            },
          },
        });
      } catch (err) {
        console.error("[AUDIT LOGIN ERROR]", err);
      }
    },
  },
};

// 2️⃣ Factory — dieksekusi HANYA saat runtime
function getAuth() {
  return NextAuth(authConfig);
}

// 3️⃣ Export API YANG SAMA (route TIDAK BERUBAH)
export async function auth(...args: Parameters<ReturnType<typeof getAuth>["auth"]>) {
  return getAuth().auth(...args);
}

export const { handlers, signIn, signOut } = getAuth();
