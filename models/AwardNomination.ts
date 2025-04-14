import mongoose, { Schema, Document, models, Model, Types } from 'mongoose';

export interface IAwardNomination extends Document {
  event_id: Types.ObjectId; // Ref 'AwardEvent'
  award_id: Types.ObjectId; // Ref embedded award within AwardEvent (denormalized for easier querying)
  nominator_user_id: Types.ObjectId; // Ref 'User'
  nominee_user_id: Types.ObjectId; // Ref 'User'
  justification: string;
  nomination_timestamp: Date;
}

const AwardNominationSchema: Schema<IAwardNomination> = new Schema(
  {
    event_id: { type: Schema.Types.ObjectId, ref: 'AwardEvent', required: true, index: true },
    // Although award_id is within the event, storing it here simplifies queries for nominations of a specific award
    award_id: { type: Schema.Types.ObjectId, required: true, index: true },
    nominator_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nominee_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    justification: { type: String, required: true },
    nomination_timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'nomination_timestamp', updatedAt: false }, // Use nomination_timestamp as createdAt
  }
);

// Optional: Compound index for ensuring a user doesn't nominate the same person multiple times for the exact same award?
// AwardNominationSchema.index({ award_id: 1, nominator_user_id: 1, nominee_user_id: 1 }, { unique: true });
// Consider if this constraint is desired.

// Prevent model overwrite during hot-reloading
const AwardNomination: Model<IAwardNomination> = models.AwardNomination || mongoose.model<IAwardNomination>('AwardNomination', AwardNominationSchema);

export default AwardNomination;