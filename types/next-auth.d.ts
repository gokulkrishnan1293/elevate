import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

// Extend the built-in session types
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's id. */
      id: string;
      /** The user's roles. */
      roles: string[];
    } & DefaultSession["user"]; // Keep the default properties like name, email, image
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   * Also used in the Credentials provider `authorize` callback return.
   */
  interface User extends DefaultUser {
    // Add your custom properties here:
    roles: string[];
    // id is already part of DefaultUser
  }
}

// Extend the built-in JWT types
declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends DefaultJWT {
    /** User ID */
    id: string;
    /** User roles */
    roles: string[];
  }
}