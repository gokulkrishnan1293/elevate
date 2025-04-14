'use client'

import { useOktaAuth } from '@okta/okta-react'; // Import useOktaAuth
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { OktaAuth } from '@okta/okta-auth-js'; // 

// Define interfaces for expected data structures
interface Team {
  _id: string; // Use _id from MongoDB
  team_name: string;
}

interface ProfileData {
    _id: string; // Use _id from MongoDB
    name?: string;
    email: string; // Should always be present from session
    roles?: string[];
    cignaManager?: string;
    teamRole?: string;
    teams?: { team_id: string; team_name?: string; is_lead: boolean }[]; // Team name might be populated
}

// Re-export the API response type
export interface ProfileApiResponse {
    profile: ProfileData | null;
    isProfileComplete: boolean;
}

const fetchWithAuth = async (url: string, oktaAuth: OktaAuth | undefined) => {
    if (!oktaAuth) {
        throw new Error('OktaAuth instance is not available');
    }
    const accessToken = oktaAuth.getAccessToken();
    if (!accessToken) {
        throw new Error('Access token not available');
    }
    console.log(accessToken)

    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json' // Ensure content type is set if needed by API
        }
    });

    if (!res.ok) {
        // Attempt to parse error message from response body
        let errorMsg = `Failed to fetch data from ${url}. Status: ${res.status}`;
        try {
            const errorData = await res.json();
            errorMsg = errorData.message || errorMsg;
        } catch (e) {
            // Ignore if response body is not JSON or empty
        }
        throw new Error(errorMsg);
    }
    // Handle cases where the response might be empty (e.g., 204 No Content)
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return res.json();
    } else {
        return null; // Or handle as text, etc., depending on expected response
    }
};

const profile = () =>{

    const { oktaAuth, authState } = useOktaAuth(); // Use Okta auth state
    const router = useRouter();
    const accessToken = oktaAuth.getAccessToken();

    console.log("entered component")
    console.log(oktaAuth)
    console.log(accessToken)

    const { data: profileInfo, error: profileError, isLoading: profileLoading, mutate: mutateProfile } = useSWR<ProfileApiResponse>(
        // Fetch only if authenticated and oktaAuth is available
        authState?.isAuthenticated && oktaAuth ? '/api/user/profile' : null,
        (url: string) => fetchWithAuth(url, oktaAuth) // Use the authenticated fetcher
      );

      console.log(profileInfo,profileError,profileLoading)

    return <div>Hi222</div>
}


export default profile