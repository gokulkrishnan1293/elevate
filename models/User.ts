import mongoose, { Schema, Document, models, Model, Types } from 'mongoose';

// Define TeamMembership interface here or import from Team model file
// This is needed for the IUser interface below
export interface TeamMembership {
  team_id: mongoose.Types.ObjectId;
  is_lead: boolean;
}

// Interface for the User document
export interface IUser extends Document {
  _id: Types.ObjectId; // Explicitly define _id type
  name: string;
  email: string;
  roles: ('User' | 'Team Lead' | 'Administrator')[];
  cignaManager?: string | null; // Added Cigna Manager field
  teamRole?: string | null; // Added Role within the team
  teams: TeamMembership[]; // Array of team memberships
  created_at: Date;
  updated_at: Date;
}

// Define the TeamMembership schema
const TeamMembershipSchema = new Schema<TeamMembership>(
  {
    team_id: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    is_lead: { type: Boolean, default: false },
  },
  { _id: false }
); // No separate _id for embedded docs unless needed

// Define the User schema
const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name for the user.'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email for the user.'],
      unique: true,
      match: [/.+\@.+\..+/, 'Please fill a valid email address'],
      index: true, // Add index for faster lookups
    },
    cignaManager: {
      type: String,
      trim: true,
      default: null, // Explicitly default to null
    },
    teamRole: {
      type: String,
      trim: true,
      default: null,
    },
    roles: {
      type: [String],
      enum: ['User', 'Team Lead', 'Administrator'],
      default: ['User'],
      required: true,
    },
    teams: {
      type: [TeamMembershipSchema], // Embed the team membership info
      default: [],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, // Automatically manage timestamps
  }
);

// Prevent model overwrite during hot-reloading
const User: Model<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
