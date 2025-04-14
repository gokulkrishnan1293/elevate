import NextAuth, { NextAuthOptions, Profile } from 'next-auth'; // Removed NextAuthUser
import OktaProvider from 'next-auth/providers/okta'; // Import OktaProvider
import dbConnect from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
// Removed bcrypt import as we won't handle passwords directly
import bcrypt from 'bcrypt';

export const authOptions: NextAuthOptions = {
  providers: [
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER!,
      // Define profile mapping if needed, or rely on standard claims
      // profile(profile) {
      //   return {
      //     id: profile.sub, // Okta subject ID
      //     name: profile.name,
      //     email: profile.email,
      //     // Map roles if available in Okta profile/claims
      //     roles: profile.groups ?? ['User'], // Example: map Okta groups to roles
      //   }
      // }
    }),
  ],
  session: {
    strategy: 'jwt', // Using JSON Web Tokens for session management
  },
  callbacks: {
    // This callback is triggered when a user signs in via Okta
    async signIn({ user, account, profile }) {
      console.log('--- Entering signIn callback ---'); // Log function entry
      await dbConnect();
      try {
        const oktaProfile = profile as Profile & { groups?: string[] }; // Cast profile, add groups if used
        console.log(`Attempting to find user with email: ${oktaProfile.email}`); // Log before query
        const existingUser = await User.findOne({ email: oktaProfile.email });
        console.log('User.findOne result:', existingUser ? `Found user ID: ${existingUser._id}` : 'User not found'); // Log result

        if (existingUser) {
          console.log('Entering existingUser block.'); // Log entering the IF block
          // Optional: Update user details if they changed in Okta
          // existingUser.name = oktaProfile.name ?? existingUser.name;
          // await existingUser.save();
          console.log('Existing user signed in:', oktaProfile.email);
          // Attach DB roles to the user object for JWT/session callbacks
          user.roles = existingUser.roles;
          user.id = existingUser._id.toString(); // Ensure DB ID is attached
          return true; // Allow sign in
        } else {
          // User doesn't exist, create them (Just-In-Time Provisioning)
          console.log('Okta profile for new user:', JSON.stringify(oktaProfile, null, 2)); // Log the profile data
          const newUser = new User({
            name: oktaProfile.name,
            email: oktaProfile.email,
            // Map Okta groups to roles, default to 'User' if no groups/mapping
            roles: oktaProfile?.groups?.includes('ElevateAdmin') ? ['Administrator', 'User'] : ['User'], // Example mapping
            teams: [], // Default empty teams
            // password_hash is not needed
          });
          try {
            await newUser.save();
            console.log('New user provisioned from Okta:', oktaProfile.email);
          } catch (saveError) {
            console.error('Error saving new user to MongoDB:', saveError);
            throw saveError; // Re-throw the error to be caught by the outer catch block
          }
          // Attach DB roles and ID to the user object
          user.roles = newUser.roles;
          user.id = newUser._id.toString();
          return true; // Allow sign in
        }
      } catch (error) {
        console.error('Error during Okta signIn callback:', error);
        return false; // Prevent sign in on error
      }
    },
    // Include user id and roles (now attached in signIn) in the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles; // Roles are now directly on the user object from signIn
      }
      return token;
    },
    // Include user id and roles in the session object accessible on the client
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // Redirect users to /login if they need to sign in
    // signOut: '/auth/signout',
    // error: '/auth/error', // Error code passed in query string as ?error=
    // verifyRequest: '/auth/verify-request', // (used for email/passwordless login)
    // newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out to disable)
  },
  secret: process.env.NEXTAUTH_SECRET, // Secret for signing JWTs
  debug: process.env.NODE_ENV === 'development', // Enable debug messages in development
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };