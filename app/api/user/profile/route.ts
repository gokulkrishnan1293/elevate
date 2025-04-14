import { NextResponse } from 'next/server';
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Not used here
import dbConnect from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import Team from '@/models/Team'; // Import Team model for validation/linking
import mongoose from 'mongoose'; // Import mongoose for ObjectId validation


// Define expected structure for profile data from MongoDB
// (Adapting from IUser interface in models/User.ts)
interface ProfileData {
    _id: string; // Use string representation of ObjectId
    name?: string;
    email: string;
    roles?: string[];
    cignaManager?: string | null;
    teamRole?: string | null;
    teams?: { team_id: string; team_name?: string; is_lead: boolean }[]; // Team name might be populated
}

interface ProfileApiResponse {
    profile: ProfileData | null; // Profile might not exist yet if JIT failed or is delayed
    isProfileComplete: boolean;
}

const OktaJwtVerifier = require('@okta/jwt-verifier');

const oktaJwtVerifier = new OktaJwtVerifier({
  issuer: process.env.NEXT_PUBLIC_OKTA_ISSUER // required
});

// GET request to fetch current user's profile status/data from MongoDB
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const accessToken = authHeader.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ message: 'No access token provided' }, { status: 401 });
        }

        try {
            // Verify the token using async/await
            const jwt = await oktaJwtVerifier.verifyAccessToken(accessToken, 'api://default');
            console.log(jwt);

            const userId = jwt.claims.sub; // Okta's user ID claim
            console.log("Okta User ID:", userId);

            if (!userId) {
                 console.error('Okta User ID (uid) not found in JWT claims.');
                 return NextResponse.json({ message: 'Invalid access token: User ID missing' }, { status: 401 });
            }

            await dbConnect();

            // Find user by Okta User ID (assuming 'oktaUserId' field exists in your User model)
            // Populate the team_id field within the teams array to get team names
            // Adjust 'oktaUserId' if your field name is different
            const user = await User.findOne({ email: userId })
                                     .populate('teams.team_id', 'team_name') as IUser | null;

            console.log("Found user in DB:", user);

            if (!user) {
                // This case might indicate an issue if JIT provisioning failed or user deleted
                console.error(`User not found in DB for Okta ID: ${userId}`);
                // Return incomplete status, frontend might need to handle this state
                return NextResponse.json({ profile: null, isProfileComplete: false }, { status: 200 });
            }

            // Check if profile is complete (based on fields we added)
            const isProfileComplete = !!(user.name && user.cignaManager && user.teamRole && user.teams && user.teams.length > 0);

            // Prepare profile data for response
            const profileData: ProfileData = {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                roles: user.roles,
                cignaManager: user.cignaManager,
                teamRole: user.teamRole,
                // Map populated teams data
                teams: user.teams?.map(t => {
                    // Map team data, ensuring types are handled
                    const team_id = (t.team_id && typeof t.team_id === 'object' && '_id' in t.team_id) ? t.team_id._id.toString() : undefined;
                    const team_name = (t.team_id && typeof t.team_id === 'object' && 'team_name' in t.team_id && typeof t.team_id.team_name === 'string') ? t.team_id.team_name : undefined;
                    return { team_id, team_name, is_lead: t.is_lead };
                })
                // Use a type predicate to filter out entries with undefined team_id and satisfy TypeScript
                .filter((t): t is { team_id: string; team_name: string | undefined; is_lead: boolean } => t.team_id !== undefined),
            };

            return NextResponse.json({
                profile: profileData,
                isProfileComplete,
            }, { status: 200 });

        } catch (error: any) {
            console.error('JWT verification or DB access failed:', error);
            // Distinguish between verification failure and other errors if needed
            if (error.message && error.message.includes('JwtParseError') || error.message.includes('JwtVerifyError')) {
                 return NextResponse.json({ message: 'Invalid access token' }, { status: 401 });
            }
            return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
        }

    } catch (error) {
        // Catch errors from getting headers, etc. (outside inner try)
        console.error('Error in GET /api/user/profile:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT request to update user's profile in MongoDB
export async function PUT(request: Request) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const accessToken = authHeader.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ message: 'No access token provided' }, { status: 401 });
        }

        try {
            // Verify token - Assuming 'api://default' is the correct audience
            const jwt = await oktaJwtVerifier.verifyAccessToken(accessToken, 'api://default');

            // Use the same claim as GET for consistency (uid)
            const oktaUserId = jwt.claims.sub;
            console.log("Okta User ID for PUT:", oktaUserId);

             if (!oktaUserId) {
                 console.error('Okta User ID (uid) not found in JWT claims for PUT.');
                 return NextResponse.json({ message: 'Invalid access token: User ID missing' }, { status: 401 });
            }


            await dbConnect();
            const body = await request.json();

            // Expect teamId from frontend dropdown selection
            const { name, cignaManager, teamRole, teamId } = body;

            // Basic validation
            if (!name || !cignaManager || !teamRole || !teamId) {
                return NextResponse.json({ message: 'Missing required profile fields (name, cignaManager, teamRole, teamId).' }, { status: 400 });
            }

            // Validate teamId is a valid ObjectId and exists
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                return NextResponse.json({ message: 'Invalid Team ID format.' }, { status: 400 });
            }
            const teamExists = await Team.findById(teamId);
            if (!teamExists) {
                return NextResponse.json({ message: 'Selected team not found.' }, { status: 400 });
            }

            // Find user by Okta ID and update
            // Adjust 'oktaUserId' if your field name is different
            const updatedUser = await User.findOneAndUpdate(
                { email: oktaUserId }, // Find condition
                {
                    $set: {
                        name, // Allow updating name from profile completion too
                        cignaManager,
                        teamRole,
                        // Update the teams array - assumes user belongs to only one team for now
                        // If multiple teams, logic needs adjustment
                        teams: [{ team_id: teamId, is_lead: false }] // Default is_lead to false
                    }
                },
                { new: true, runValidators: true } // Return updated doc, run schema validators
            ) as IUser | null;

            if (!updatedUser) {
                 // It's possible the user exists in Okta but not yet in the DB (JIT failure?)
                console.error(`User with Okta ID ${oktaUserId} not found in DB for update.`);
                return NextResponse.json({ message: 'User not found for update' }, { status: 404 });
            }

            console.log(`Profile updated in MongoDB for user with Okta ID: ${oktaUserId}`);
            return NextResponse.json({ message: 'Profile updated successfully.' }, { status: 200 });

        } catch (error: any) {
            console.error('JWT verification or DB update failed:', error);
             // Distinguish between verification failure and other errors if needed
            if (error.message && error.message.includes('JwtParseError') || error.message.includes('JwtVerifyError')) {
                 return NextResponse.json({ message: 'Invalid access token' }, { status: 401 });
            }
            if (error.name === 'ValidationError') {
                 return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
            }
            return NextResponse.json({ message: 'Error updating profile' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in PUT /api/user/profile:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST request to find or create a user profile after client-side login
export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const accessToken = authHeader.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ message: 'No access token provided' }, { status: 401 });
        }

        try {
            // Verify token
            const jwt = await oktaJwtVerifier.verifyAccessToken(accessToken, 'api://default');
            const oktaUserId = jwt.claims.uid; // Okta User ID
            const emailFromToken = jwt.claims.sub; // Email is usually in 'sub' claim

            if (!oktaUserId || !emailFromToken) {
                console.error('Okta User ID (uid) or Email (sub) not found in JWT claims for POST.');
                return NextResponse.json({ message: 'Invalid access token: User ID or Email missing' }, { status: 401 });
            }

            await dbConnect();
            const body = await request.json();

            // Expect name from the client, email should ideally match token
            const { name, email } = body;

            // Validate required fields from body
            if (!name || !email) {
                return NextResponse.json({ message: 'Missing required fields (name, email) in request body.' }, { status: 400 });
            }

            // Optional: Verify email from body matches token claim for security
            if (email.toLowerCase() !== emailFromToken.toLowerCase()) {
                 console.warn(`Email mismatch: Token (${emailFromToken}) vs Body (${email}) for Okta ID ${oktaUserId}`);
                 // Decide if this should be an error or just a warning
                 // return NextResponse.json({ message: 'Email in request body does not match token.' }, { status: 400 });
            }

            console.log(`Attempting upsert for user email: ${email}, Okta ID: ${oktaUserId}`);

            // Find user by email and update/create (upsert)
            const upsertedUser = await User.findOneAndUpdate(
                { email: email.toLowerCase() }, // Find condition (case-insensitive email)
                {
                    $set: { // Fields to set/update on find or insert
                        name: name,
                        oktaUserId: oktaUserId, // Store/update Okta ID
                        email: email.toLowerCase(), // Ensure email is stored consistently
                    },
                    $setOnInsert: { // Fields to set only on insert (creation)
                        roles: ['User'], // Default roles
                        teams: [], // Default empty teams
                        // cignaManager and teamRole will be null by default per schema
                    }
                },
                {
                    upsert: true, // Create if not found
                    new: true, // Return the modified document
                    runValidators: true, // Run schema validations
                    setDefaultsOnInsert: true // Apply schema defaults on insert
                }
            ) as IUser | null;

            if (!upsertedUser) {
                 // This shouldn't happen with upsert: true unless there's a major DB issue
                console.error(`Upsert failed for user email: ${email}, Okta ID: ${oktaUserId}`);
                return NextResponse.json({ message: 'Failed to create or find user profile.' }, { status: 500 });
            }

            console.log(`User profile ensured in DB for Okta ID: ${oktaUserId}, DB ID: ${upsertedUser._id}`);

            // Prepare response data (similar to GET)
             const isProfileComplete = !!(upsertedUser.name && upsertedUser.cignaManager && upsertedUser.teamRole && upsertedUser.teams && upsertedUser.teams.length > 0);
             const profileData: ProfileData = {
                 _id: upsertedUser._id.toString(),
                 name: upsertedUser.name,
                 email: upsertedUser.email,
                 roles: upsertedUser.roles,
                 cignaManager: upsertedUser.cignaManager,
                 teamRole: upsertedUser.teamRole,
                 teams: upsertedUser.teams?.map(t => ({ team_id: t.team_id.toString(), is_lead: t.is_lead })) // Don't need populate here
             };


            return NextResponse.json({
                message: 'User profile ensured successfully.',
                profile: profileData,
                isProfileComplete
            }, { status: 200 }); // Use 200 OK for successful upsert

        } catch (error: any) {
            console.error('JWT verification or DB upsert failed:', error);
            if (error.message && error.message.includes('JwtParseError') || error.message.includes('JwtVerifyError')) {
                 return NextResponse.json({ message: 'Invalid access token' }, { status: 401 });
            }
            if (error.name === 'ValidationError') {
                 return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
            }
            return NextResponse.json({ message: 'Error ensuring user profile' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in POST /api/user/profile:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}