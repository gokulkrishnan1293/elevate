import mongoose, { Schema, Document, models, Model, Types } from 'mongoose';

// --- Embedded Award Interface ---
interface IAward {
  award_id: Types.ObjectId;
  award_name: string;
  award_description?: string;
  points: number;
  winner_user_id?: Types.ObjectId; // Ref 'User'
  winner_selection_timestamp?: Date;
}

// --- Main AwardEvent Interface ---
export interface IAwardEvent extends Document {
  event_name: string;
  event_type: 'Main' | 'Team';
  creator_user_id: Types.ObjectId; // Ref 'User'
  team_id?: Types.ObjectId; // Ref 'Team', required if event_type is 'Team'
  status: 'Draft' | 'Nominating' | 'UserVoting' | 'JudgeVoting' | 'Decision' | 'Completed';
  nomination_start_date?: Date;
  nomination_end_date?: Date;
  user_voting_end_date?: Date;
  judge_voting_end_date?: Date;
  main_judge_user_id?: Types.ObjectId; // Ref 'User'
  assigned_judge_ids?: Types.ObjectId[]; // Array of Ref 'User'
  created_at: Date;
  updated_at: Date;
  awards: IAward[]; // Embed the awards within the event
}

// --- Embedded Award Schema ---
const AwardSchema = new Schema<IAward>({
  award_id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId(), required: true },
  award_name: { type: String, required: true },
  award_description: { type: String },
  points: { type: Number, required: true, default: 0 },
  winner_user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  winner_selection_timestamp: { type: Date },
}, { _id: false });


// --- Main AwardEvent Schema ---
const AwardEventSchema: Schema<IAwardEvent> = new Schema(
  {
    event_name: { type: String, required: true },
    event_type: { type: String, enum: ['Main', 'Team'], required: true },
    creator_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    team_id: { type: Schema.Types.ObjectId, ref: 'Team' }, // Add validation: required if event_type is 'Team'
    status: {
      type: String,
      enum: ['Draft', 'Nominating', 'UserVoting', 'JudgeVoting', 'Decision', 'Completed'],
      default: 'Draft',
      required: true,
      index: true,
    },
    nomination_start_date: { type: Date },
    nomination_end_date: { type: Date },
    user_voting_end_date: { type: Date },
    judge_voting_end_date: { type: Date },
    main_judge_user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    assigned_judge_ids: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    awards: { type: [AwardSchema], required: true }, // Embed awards
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    // Add validation logic, e.g., ensure team_id exists if type is 'Team'
    // Ensure dates are logical (end > start)
  }
);

// Add index for potentially common queries
AwardEventSchema.index({ status: 1, event_type: 1 });
AwardEventSchema.index({ team_id: 1, status: 1 }); // For team-specific views

// Prevent model overwrite during hot-reloading
const AwardEvent: Model<IAwardEvent> = models.AwardEvent || mongoose.model<IAwardEvent>('AwardEvent', AwardEventSchema);

export default AwardEvent;