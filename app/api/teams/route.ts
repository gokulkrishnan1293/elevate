import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjust path if needed
import dbConnect from '@/lib/mongodb';
import Team from '@/models/Team';

// GET request to fetch all teams (for dropdowns, etc.)
// Add permission checks if needed (e.g., only authenticated users?)
export async function GET() {
  // Optional: Check session if only authenticated users should see teams
  const session = await getServerSession(authOptions);
  if (!session) {
     // Decide if unauthenticated users can fetch teams. If not:
     // return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    await dbConnect();

    // Fetch all teams, selecting only necessary fields
    const teams = await Team.find({}, '_id team_name').sort({ team_name: 1 }); // Sort alphabetically

    return NextResponse.json({ teams }, { status: 200 });

  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ message: 'Error fetching teams list' }, { status: 500 });
  }
}

// Optional: Add POST for creating teams (likely Admin only)
// export async function POST(request: Request) { ... }