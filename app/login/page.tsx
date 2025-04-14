'use client';

import { useOktaAuth } from '@okta/okta-react'; // Import useOktaAuth
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { oktaAuth, authState } = useOktaAuth(); // Use Okta hook
  const router = useRouter();
  const searchParams = useSearchParams();
  // We'll rely on Okta's authState instead of NextAuth's useSession here for login status
  // const { status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/'; // Default redirect to home page

  // Redirect if user is already authenticated via Okta
  useEffect(() => {
    if (authState?.isAuthenticated) {
      // Use restoreOriginalUri from the provider or redirect manually
      oktaAuth.authStateManager.updateAuthState(); // Ensure state is fresh
      router.push(callbackUrl);
    }
  }, [authState, router, callbackUrl, oktaAuth]);

  const handleOktaSignIn = async () => {
    setIsLoading(true);
    // Start the Okta sign-in flow (redirect)
    await oktaAuth.signInWithRedirect({ originalUri: callbackUrl });
    // No need to setIsLoading(false) here as the page will redirect
  };

  // Show loading state based on Okta's authState or our button loading state
  if (authState?.isPending || isLoading) {
     return (
       <div className="flex min-h-screen items-center justify-center bg-gray-100">
         <p>Loading...</p>
       </div>
     );
  }

  // Don't render button if already authenticated (should be redirected)
  if (authState?.isAuthenticated) {
      return (
       <div className="flex min-h-screen items-center justify-center bg-gray-100">
         <p>Already logged in. Redirecting...</p>
       </div>
     );
  }

  // Only show login button if not authenticated and not pending
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-md">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Login to Elevate
        </h2>
        <button
          onClick={handleOktaSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {/* Optional: Add Okta logo */}
          {isLoading ? 'Redirecting to Okta...' : 'Sign in with Okta'}
        </button>
        {/* Display error from query params if Okta redirect fails */}
        {searchParams.get('error') && (
           <p className="mt-4 text-sm text-red-600">
             Login failed: {searchParams.get('error')}
           </p>
        )}
      </div>
    </div>
  );
}