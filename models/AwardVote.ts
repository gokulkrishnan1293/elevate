import mongoose, { Schema, Document, models, Model, Types } from 'mongoose';

export interface IAwardVote extends Document {
  event_id: Types.ObjectId; // Ref 'AwardEvent'
  award_id: Types.ObjectId; // Ref embedded award within AwardEvent
  nominee_user_id: Types.ObjectId; // Ref 'User' - The person being voted for
  voter_user_id: Types.ObjectId; // Ref 'User' - The person casting the vote
  vote_type: 'UserEndorsement' | 'JudgeVote';
  points_awarded: number; // 1 for User, 10 for Judge
  vote_timestamp: Date;
}

const AwardVoteSchema: Schema<IAwardVote> = new Schema(
  {
    event_id: { type: Schema.Types.ObjectId, ref: 'AwardEvent', required: true, index: true },
    // Storing award_id here simplifies aggregation queries for vote totals per award
    award_id: { type: Schema.Types.ObjectId, required: true, index: true },
    nominee_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    voter_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vote_type: { type: String, enum: ['UserEndorsement', 'JudgeVote'], required: true, index: true },
    points_awarded: { type: Number, required: true }, // Should be set based on vote_type in application logic
    vote_timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'vote_timestamp', updatedAt: false }, // Use vote_timestamp as createdAt
  }
);

// Compound index to prevent duplicate votes (e.g., one user endorsing the same nominee multiple times *if desired*)
// Or one judge voting for the same nominee multiple times.
// Depending on rules, uniqueness might be on (award_id, nominee_user_id, voter_user_id, vote_type)
AwardVoteSchema.index({ award_id: 1, nominee_user_id: 1, voter_user_id: 1, vote_type: 1 }, { unique: true });

// Prevent model overwrite during hot-reloading
const AwardVote: Model<IAwardVote> = models.AwardVote || mongoose.model<IAwardVote>('AwardVote', AwardVoteSchema);

export default AwardVote;