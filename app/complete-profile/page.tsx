'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useOktaAuth } from '@okta/okta-react'; // Import useOktaAuth
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { OktaAuth } from '@okta/okta-auth-js'; // Import OktaAuth type

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

// Fetcher function for SWR that includes Okta Access Token
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

// Simple fetcher for public endpoints (if any)
const simpleFetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) {
        throw new Error(`Failed to fetch data from ${url}. Status: ${res.status}`);
    }
     const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return res.json();
    } else {
        return null;
    }
});



export default function CompleteProfilePage() {
  const { oktaAuth, authState } = useOktaAuth(); // Use Okta auth state
  const router = useRouter();

  console.log("entered component")
  console.log(oktaAuth)
  // Fetch profile status using SWR with Auth
  const { data: profileInfo, error: profileError, isLoading: profileLoading, mutate: mutateProfile } = useSWR<ProfileApiResponse>(
    // Fetch only if authenticated and oktaAuth is available
    authState?.isAuthenticated && oktaAuth ? '/api/user/profile' : null,
    (url: string) => fetchWithAuth(url, oktaAuth) // Use the authenticated fetcher
  );

  // Fetch list of available teams using SWR (assuming this might need auth too, adjust fetcher if not)
  // If /api/teams is public, use simpleFetcher. If it requires auth, use fetchWithAuth.
  const { data: teamsData, error: teamsError, isLoading: teamsLoading } = useSWR<{ teams: Team[] }>(
    authState?.isAuthenticated && oktaAuth ? '/api/teams' : null, // Only fetch if authenticated
    (url: string) => fetchWithAuth(url, oktaAuth) // Use authenticated fetcher (change to simpleFetcher if public)
  );

  // Form state
  const [name, setName] = useState('');
  const [cignaManager, setCignaManager] = useState('');
  const [teamRole, setTeamRole] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState(''); // Use teamId again
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form if profile data exists
 useEffect(() => {
    console.log(profileInfo)
    if (profileInfo?.profile) {
      setName(profileInfo.profile.name || authState?.idToken?.claims.name || ''); // Use Okta token name as fallback
      setCignaManager(profileInfo.profile.cignaManager || '');
      setTeamRole(profileInfo.profile.teamRole || '');
      // Pre-select team if user already belongs to one
      if (profileInfo.profile.teams && profileInfo.profile.teams.length > 0) {
          setSelectedTeamId(profileInfo.profile.teams[0].team_id); // Use team_id
      }
    }
  }, [profileInfo, authState]); // Depend on authState

  // Redirect logic based on session and profile status
  useEffect(() => {
    console.log(profileInfo)
    // Redirect if not authenticated (and not pending)
    if (!authState?.isAuthenticated && !authState?.isPending) {
       // Okta usually handles the redirect loop to its login page.
       // If you want a specific local login page first, redirect here.
       // router.push('/login'); // Or let Okta handle the redirect
       console.log("User not authenticated, Okta should handle redirect.");
    }
    // Redirect if authenticated and profile is complete
  
    else if (authState?.isAuthenticated && profileInfo && profileInfo.isProfileComplete) {
      router.push('/'); // Redirect to dashboard
    }
  }, [authState, profileInfo, router]); // Depend on authState

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!selectedTeamId) { // Check selectedTeamId
        setFormError('Please select a team.');
        setIsSubmitting(false);
        return;
    }
    // Add other client-side validation if needed
    if (!name || !cignaManager || !teamRole) {
        setFormError('All fields except team selection are required.');
        setIsSubmitting(false);
        return;
    }


    try {
      if (!oktaAuth) {
          throw new Error("OktaAuth is not available for submitting profile.");
      }
      const accessToken = oktaAuth.getAccessToken();
       if (!accessToken) {
        throw new Error('Access token not available for submitting profile.');
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`, // Add Authorization header
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          cignaManager,
          teamRole,
          teamId: selectedTeamId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.message || 'Failed to update profile.');
      } else {
        console.log('Profile updated successfully');
        // Mutate profile data to reflect completion and trigger redirect
        mutateProfile(); // Re-fetch profile, useEffect will handle redirect
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setFormError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading states including Okta's pending state and teamsLoading
  if (authState?.isPending || profileLoading || teamsLoading) {
    return <div className="flex min-h-screen items-center justify-center"><p>Loading authentication...</p></div>;
  }

  // Error states including teamsError
  if (profileError) return <div className="flex min-h-screen items-center justify-center"><p>Error loading profile data.</p></div>;
  if (teamsError) return <div className="flex min-h-screen items-center justify-center"><p>Error loading teams list.</p></div>;

  // If authenticated but profile check hasn't finished (and not loading profile already)
  if (authState?.isAuthenticated && !profileInfo && !profileLoading) {
     return <div className="flex min-h-screen items-center justify-center"><p>Loading profile data...</p></div>;
  }

  // Render form only if authenticated and profile is incomplete
  if (authState?.isAuthenticated && profileInfo && !profileInfo.isProfileComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-md">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mb-6 text-center text-sm text-gray-600">
            Welcome! Please provide some additional details to complete your setup.
            Your email is: <span className="font-medium">{profileInfo.profile?.email}</span>
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                id="name" name="name" type="text" required value={name}
                onChange={(e) => setName(e.target.value)} disabled={isSubmitting}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            {/* Cigna Manager Field */}
            <div>
              <label htmlFor="cignaManager" className="block text-sm font-medium text-gray-700">Cigna Manager Name</label>
              <input
                id="cignaManager" name="cignaManager" type="text" required value={cignaManager}
                onChange={(e) => setCignaManager(e.target.value)} disabled={isSubmitting}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            {/* Team Selection Field (Restored Select) */}
            <div>
              <label htmlFor="team" className="block text-sm font-medium text-gray-700">Select Your Team</label>
              <select
                id="team" name="team" required value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)} disabled={isSubmitting || !teamsData?.teams}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="" disabled>-- Select a Team --</option>
                {/* Explicitly type team here */}
                {teamsData?.teams?.map((team: Team) => (
                  <option key={team._id} value={team._id}>
                    {team.team_name}
                  </option>
                ))}
              </select>
              {!teamsData?.teams && teamsLoading && <p className="text-xs text-gray-500">Loading teams...</p>}
            </div>

             {/* Team Role Field */}
             <div>
              <label htmlFor="teamRole" className="block text-sm font-medium text-gray-700">Your Role in Team</label>
              <input
                id="teamRole" name="teamRole" type="text" required value={teamRole}
                onChange={(e) => setTeamRole(e.target.value)} disabled={isSubmitting}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g., Developer, QA, PO, SM"
              />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div>
              <button
                type="submit" disabled={isSubmitting}
                className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Fallback or redirecting state
  return <div className="flex min-h-screen items-center justify-center"><p>Loading or redirecting...</p></div>;
}