'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useOktaAuth } from '@okta/okta-react'; // Import Okta Auth hook
import type { UserClaims } from '@okta/okta-auth-js'; // Import UserClaims type
import type { AccessToken } from '@okta/okta-auth-js'; // Import AccessToken type

// Ensure this path is correct relative to your project structure
import { ProfileApiResponse } from '@/app/complete-profile/page';

// Fetcher function for SWR
// Accepts the AccessToken object from Okta
const fetcher = (url: string, accessToken: AccessToken | undefined | null) => {
  if (!accessToken?.accessToken) {
    // Handle cases where accessToken or its value is missing
    // Depending on requirements, you might throw an error or return a specific response
    console.error("Fetcher called without a valid access token.");
    throw new Error("Access token is missing or invalid.");
  }
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken.accessToken}`, // Use the accessToken property
    },
  }).then((res) => {
    if (!res.ok) {
      // Handle specific errors maybe?
      if (res.status === 401) throw new Error('Not authenticated');
      throw new Error('Failed to fetch profile status');
    }
    return res.json();
  });
};

// Define an interface for the session state
interface SessionState {
  user: UserClaims;
}

export default function Home() {
  const { oktaAuth, authState } = useOktaAuth(); // Use Okta Auth hook
  const router = useRouter();
  // Use the defined interface for session state
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    if (authState?.isAuthenticated) {
      // Get user info from Okta
      oktaAuth.getUser().then((user) => {
        setSession({ user }); // Store user info in local state
      });
    } else {
      setSession(null);
    }
  }, [authState, oktaAuth]);

  // Fetch profile status using SWR, only when authenticated
  const { data: profileInfo, error: profileError, isLoading: profileLoading } = useSWR<ProfileApiResponse>(
    authState?.isAuthenticated ? '/api/user/profile' : null,
    // Pass the actual accessToken object (or null/undefined) to the updated fetcher
    (url: string) => fetcher(url, authState?.accessToken),
    { revalidateOnFocus: false } // Optional: prevent re-fetching on window focus
  );

  useEffect(() => {
    // Redirect to login if unauthenticated
    if (!authState?.isAuthenticated) {
      console.log("Status: Unauthenticated, redirecting to login");
      router.push('/login');
    }
    // Redirect to complete profile if authenticated but profile is incomplete
    // Ensure profileInfo is loaded before checking isProfileComplete
    // Redirect to complete profile only if authenticated, loading finished, profile exists, and it's incomplete
    else if (authState?.isAuthenticated && !profileLoading && profileInfo && !profileInfo.isProfileComplete) {
      console.log("Status: Authenticated, Profile Loaded & Incomplete, redirecting to complete-profile");
      console.log(profileInfo)
      router.push('/complete-profile');
    } else if (authState?.isAuthenticated && profileInfo?.isProfileComplete) {
      console.log("Status: Authenticated, Profile Complete");
      // Stay on this page
    } else if (authState?.isAuthenticated && !profileInfo && !profileError) {
      console.log("Status: Authenticated, Profile loading...");
      // Still loading profile info
    } else if (profileError) {
      console.error("Profile fetch error detected in useEffect:", profileError);
      // Error state is handled below
    } else if (authState?.isPending) {
      console.log("Status: Auth loading...");
      // Still loading auth state
    }
  }, [authState, router, profileInfo, profileError]); // Add router, profileInfo, and profileError

  // --- Render Logic ---

  // 1. Handle Auth Loading State
  if (authState?.isPending) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p>Loading authentication...</p>
      </main>
    );
  }

  // 2. Handle Unauthenticated State (Redirect should handle this, but added as fallback)
  if (!authState?.isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p>Redirecting to login...</p>
      </main>
    );
  }

  // 3. Handle Authenticated State
  if (authState?.isAuthenticated) {
    // 3a. Handle Profile Loading State (while authenticated)
    if (profileLoading) {
      // Check profileLoading OR if profileInfo is still null/undefined
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
          <p>Loading user profile...</p>
        </main>
      );
    }

    // 3b. Handle Profile Fetch Error State
    if (profileError) {
      console.error("Rendering Profile fetch error:", profileError);
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
          <p className="text-red-500">Error loading user profile. Please try refreshing.</p>
          <button
            onClick={() => oktaAuth.signOut({ postLogoutRedirectUri: 'http://localhost:3000/login' })} // Use Okta SignOut
            className="mt-4 rounded bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Sign Out
          </button>
        </main>
      );
    }

    // 3c. Handle Profile Incomplete State (Redirect should handle this, but added as fallback)
    // Add check for profileInfo existence before accessing its properties
    if (profileInfo && !profileInfo.isProfileComplete) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
          <p>Redirecting to complete profile...</p>
        </main>
      );
    }

    // 3d. Render Dashboard Content (Authenticated AND Profile Complete)
    return (
      <main className="flex min-h-screen flex-col items-center justify-start p-6 md:p-12 lg:p-24">
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-8">
          <p className="text-lg mb-2 lg:mb-0">
            Welcome, <span className="font-semibold">{session?.user?.name}</span>!
            <span className="ml-4 text-xs text-gray-500">
              ({/* Check if roles is an array before joining, otherwise display if string */})
              {session?.user?.roles && Array.isArray(session.user.roles)
                ? session.user.roles.join(', ')
                : typeof session?.user?.roles === 'string'
                ? session.user.roles
                : ''}
            </span>
          </p>
          <button
            onClick={() => oktaAuth.signOut({ postLogoutRedirectUri: 'http://localhost:3000/login' })} // Use Okta SignOut
            className="rounded bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>

        <div className="w-full max-w-5xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center lg:text-left">Elevate Dashboard</h1>
          <p className="mt-4 text-gray-600 mb-8 text-center lg:text-left">
            Your personalized dashboard content will go here.
          </p>
          <div className="bg-gray-100 p-4 rounded border border-gray-300">
            <p className="text-gray-700">Placeholder for dashboard widgets...</p>
            {/* Add components for Pending Feedback, Active Awards etc. based on design */}
          </div>
        </div>
      </main>
    );
  }

  // Fallback for any other unexpected state
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <p>An unexpected state occurred.</p>
    </main>
  );
}
