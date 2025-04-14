'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react'; // Added useRef
import { OktaAuth, OktaAuthOptions, UserClaims } from '@okta/okta-auth-js';
import { Security, useOktaAuth } from '@okta/okta-react'; // Import useOktaAuth
import { useRouter } from 'next/navigation';

// Ensure environment variables are defined (consider runtime checks too)
const OKTA_ISSUER = process.env.NEXT_PUBLIC_OKTA_ISSUER;
const OKTA_CLIENT_ID = process.env.NEXT_PUBLIC_OKTA_CLIENT_ID;

interface OktaProviderWrapperProps {
  children: React.ReactNode;
}

// Internal component to access authState after Security context is available
function AuthHandler({ children }: { children: React.ReactNode }) {
  const { oktaAuth, authState } = useOktaAuth();
  const hasSyncedProfile = useRef(false); // Track if profile sync API call was made

  useEffect(() => {
    const syncUserProfile = async () => {
      if (authState?.isAuthenticated && authState.accessToken && !hasSyncedProfile.current) {
        console.log('User authenticated, attempting to sync profile...');
        hasSyncedProfile.current = true; // Mark as attempted

        try {
          // Get user claims for name and email
          const user = await oktaAuth.getUser() as UserClaims;
          const name = user.name;
          const email = user.email;

          if (!name || !email) {
            console.error('Could not retrieve name or email from Okta user claims.');
            // Optionally handle this error, e.g., redirect to an error page or show a message
            return;
          }

          const response = await fetch('/api/user/profile', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authState.accessToken.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to sync user profile:', response.status, errorData.message || 'Unknown error');
            // Handle API error (e.g., show notification)
            // Reset flag if sync failed and might need retry? Depends on strategy.
            // hasSyncedProfile.current = false;
          } else {
            const result = await response.json();
            console.log('User profile sync successful:', result.message);
            // Optionally use result.profile or result.isProfileComplete here
          }
        } catch (error) {
          console.error('Error during user profile sync fetch:', error);
          // Handle fetch error (e.g., network issue)
          // hasSyncedProfile.current = false; // Allow retry on next auth state change?
        }
      } else if (!authState?.isAuthenticated) {
        // Reset the flag if the user logs out
        hasSyncedProfile.current = false;
      }
    };

    syncUserProfile();

  }, [authState, oktaAuth]); // Depend on authState and oktaAuth

  return <>{children}</>; // Render children normally
}


export default function OktaProviderWrapper({ children }: OktaProviderWrapperProps) {
  const router = useRouter();
  const [configError, setConfigError] = useState<string | null>(null);

  // Use useMemo to create the oktaAuth instance only once,
  // preventing recreation on every render.
  const oktaAuth = useMemo(() => {
    if (!OKTA_ISSUER || !OKTA_CLIENT_ID) {
      const errorMsg = "Okta Issuer or Client ID is not configured. Please check NEXT_PUBLIC_OKTA_ISSUER and NEXT_PUBLIC_OKTA_CLIENT_ID environment variables.";
      console.error(errorMsg);
      // Set error state here, but return null for oktaAuth
      // We'll handle rendering the error message outside useMemo
      return null;
    }

    // Check if window is defined before accessing window.location.origin
    if (typeof window === 'undefined') {
        return null; // Cannot initialize on the server
    }

    const REDIRECT_URI = `${window.location.origin}/login/callback`;

    const oktaAuthConfig: OktaAuthOptions = {
      issuer: OKTA_ISSUER,
      clientId: OKTA_CLIENT_ID,
      redirectUri: REDIRECT_URI,
      scopes: ['openid', 'profile', 'email'], // Request necessary scopes
      pkce: true, // Enable PKCE for security
    };

    return new OktaAuth(oktaAuthConfig);
  }, []); // Empty dependency array ensures this runs only once

  // Set config error state based on the result of useMemo
  useEffect(() => {
      if (!OKTA_ISSUER || !OKTA_CLIENT_ID) {
          setConfigError("Okta Issuer or Client ID is not configured. Please check NEXT_PUBLIC_OKTA_ISSUER and NEXT_PUBLIC_OKTA_CLIENT_ID environment variables.");
      } else {
          setConfigError(null); // Clear error if config is present
      }
  }, []);


  // Handle redirects after Okta login/logout
  const restoreOriginalUri = async (_oktaAuth: OktaAuth, originalUri: string | undefined) => {
    router.replace(originalUri || '/'); // Redirect to original URI or home
  };


  // Render error if config is missing
  if (configError) {
     return (
        <div className="flex min-h-screen items-center justify-center">
           <div className="rounded border border-red-400 bg-red-100 p-4 text-red-700">
              Error: {configError}
           </div>
        </div>
     );
  }

  // Render loading or null while oktaAuth is being initialized or if running server-side initially
  if (!oktaAuth) {
     return (
        <div className="flex min-h-screen items-center justify-center">
           <p>Initializing authentication...</p>
           {/* Or return null if server-side rendering this part */}
        </div>
     );
  }

  return (
    <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
      <AuthHandler>{children}</AuthHandler>
    </Security>
  );
}