'use client'; // This directive marks the component as a Client Component

import { SessionProvider } from 'next-auth/react';
import React from 'react';

interface AuthProviderProps {
  children: React.ReactNode;
  // We might pass the session from a server component later if needed, but start simple
  // session?: Session | null; 
}

export default function AuthProvider({ children }: AuthProviderProps) {
  // The SessionProvider fetches the session client-side automatically
  return <SessionProvider>{children}</SessionProvider>;
}