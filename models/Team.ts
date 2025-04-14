import mongoose, { Schema, Document, models, Model } from 'mongoose';

// Interface for the embedded TeamMembership document (used in User model)
export interface TeamMembership {
  team_id: mongoose.Types.ObjectId; // Reference to the Team document
  is_lead: boolean;
}

// Interface for the Team document
export interface ITeam extends Document {
  team_name: string;
  created_at: Date;
  // Note: Members are primarily tracked in the User model's 'teams' array
  // We could add methods here if needed, e.g., to find members
}

// Define the Team schema
const TeamSchema: Schema<ITeam> = new Schema(
  {
    team_name: {
      type: String,
      required: [true, 'Please provide a name for the team.'],
      trim: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false }, // Only manage created_at automatically
  }
);

// Prevent model overwrite during hot-reloading
const Team: Model<ITeam> = models.Team || mongoose.model<ITeam>('Team', TeamSchema);

export default Team;