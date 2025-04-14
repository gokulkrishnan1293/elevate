'use client';

import Link from 'next/link';
import { useOktaAuth } from '@okta/okta-react'; // Import Okta hook
import { usePathname } from 'next/navigation'; // To highlight active link

// Define navigation items with potential role restrictions
const navItems = [
  { href: '/', label: 'Dashboard', roles: ['User', 'Team Lead', 'Administrator'] },
  // Feedback Section (Example structure - adjust based on final routing)
  { href: '/feedback/request', label: 'Request Feedback', roles: ['User', 'Team Lead', 'Administrator'] },
  { href: '/feedback/provide', label: 'Provide Feedback', roles: ['User', 'Team Lead', 'Administrator'] }, // Shows pending requests
  { href: '/feedback/view/my', label: 'My Feedback', roles: ['User', 'Team Lead', 'Administrator'] },
  { href: '/feedback/view/team', label: 'Team Feedback', roles: ['Team Lead', 'Administrator'] }, // Conditional
  { href: '/feedback/view/all', label: 'All Feedback', roles: ['Administrator'] }, // Conditional
  // Awards Section (Example structure)
  { href: '/awards/active', label: 'Active Awards', roles: ['User', 'Team Lead', 'Administrator'] },
  { href: '/awards/history', label: 'Award History', roles: ['User', 'Team Lead', 'Administrator'] },
  { href: '/awards/manage', label: 'Manage Awards', roles: ['Team Lead', 'Administrator'] }, // Conditional
  // Admin Section
  { href: '/admin/users', label: 'Manage Users', roles: ['Administrator'] }, // Conditional
  { href: '/admin/teams', label: 'Manage Teams', roles: ['Administrator'] }, // Conditional
];

export default function Sidebar() {
  const { oktaAuth, authState } = useOktaAuth();
  const pathname = usePathname();

  // Show loading state or null while authState is resolving
  if (!authState) {
    return null; // Or a loading indicator
  }

  if (!authState.isAuthenticated) {
    // Don't render sidebar if not authenticated
    return null;
  }

  // Get user info from idToken claims
  const userName = authState.idToken?.claims.name;
  const userEmail = authState.idToken?.claims.email;

  // Filter nav items based on user roles
  // TODO: Re-implement role-based filtering if needed by fetching user profile from DB
  const accessibleNavItems = navItems; // Show all items for now

  return (
    <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col min-h-screen"> {/* Adjust styling as needed */}
      <div className="mb-6">
        {/* Optional: Add Logo or App Name */}
        <h1 className="text-2xl font-semibold text-center">Elevate</h1>
      </div>
      <nav className="flex-grow">
        <ul>
          {accessibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href} className="mb-2">
                <Link
                  href={item.href}
                  className={`block px-4 py-2 rounded hover:bg-gray-700 ${isActive ? 'bg-indigo-600 font-semibold' : ''}`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-700">
         <p className="text-sm text-gray-400 mb-2 truncate" title={userEmail ?? ''}>
            {userName ?? userEmail} {/* Show name, fallback to email */}
         </p>
         <button
            onClick={async () => {
              try {
                await oktaAuth.signOut();
              } catch (error) {
                console.error('Error signing out:', error);
                // Handle sign-out error if necessary
              }
            }}
            className="w-full rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Sign Out
          </button>
      </div>
    </aside>
  );
}