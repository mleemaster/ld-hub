/*
 * NextAuth v5 configuration for single-user credentials auth.
 * Password is stored as a bcrypt hash directly in this file.
 * No database adapter — session is JWT-based (30-day expiry).
 *
 * To change the password:
 *   1. Run: node -e "require('bcryptjs').hash('new-password',12).then(console.log)"
 *   2. Replace the HASHED_PASSWORD constant below
 *   3. Redeploy
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const HASHED_PASSWORD = "$2b$12$6NfaeZhtOL43lOF0Yk6na.ml9uylhMv7KSXIJKrGbXwnfd0i0hzuG";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.password || typeof credentials.password !== "string") return null;

        const isValid = await bcrypt.compare(credentials.password, HASHED_PASSWORD);

        if (isValid) {
          return { id: "1", name: "Morgan", email: "morgan@leemasterdesign.com" };
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
});
