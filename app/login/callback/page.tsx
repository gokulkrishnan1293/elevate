'use client';

import React, { useEffect, useRef } from 'react'; // Added useRef
import { useOktaAuth } from '@okta/okta-react';
import { useRouter } from 'next/navigation';

const LoginCallback = () => {
  const { oktaAuth, authState } = useOktaAuth();
  const router = useRouter();
  const hasHandledRedirect = useRef(false); // Prevent multiple calls

  useEffect(() => {
    // Only attempt to handle redirect once and if oktaAuth is available
    // and we are not already authenticated or pending authentication state resolution.
    if (oktaAuth && !hasHandledRedirect.current && !authState?.isAuthenticated && !authState?.isPending) {
      console.log('Okta callback: Handling redirect...');
      hasHandledRedirect.current = true; // Mark as handled

      oktaAuth.handleLoginRedirect()
         .then(() => {
            console.log('Okta handleLoginRedirect successful. Waiting for restoreOriginalUri...');
            // The restoreOriginalUri function configured in OktaProviderWrapper should now handle the redirect.
            // No explicit router.push('/') here needed unless restoreOriginalUri fails.
         })
         .catch((err) => {
            console.error('Okta handleLoginRedirect error:', err);
            // Redirect to login page with error
            router.push('/login?error=OktaCallbackError');
         });
    } else if (authState?.isAuthenticated) {
        // If already authenticated when landing here, restoreOriginalUri should have worked
        // or will work shortly. Log this state.
        console.log('Okta callback: AuthState is authenticated.');
        router.push('/');
    } else if (authState?.isPending) {
        console.log('Okta callback: AuthState is pending...');
    } else if (!oktaAuth) {
        console.log('Okta callback: oktaAuth not available yet...');
    }

  // Include oktaAuth in dependencies as we check it
  }, [oktaAuth, authState, router]);

  // Render a consistent loading state while processing
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Processing login...</p>
    </div>
  );
};

export default LoginCallback;