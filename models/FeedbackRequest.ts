import mongoose, { Schema, Document, models, Model, Types } from 'mongoose';

// --- Embedded Document Interfaces ---

interface IAchievement {
  achievement_id: Types.ObjectId;
  description: string;
  order: number;
}

interface IQuestion {
  question_id: Types.ObjectId;
  text: string;
  order: number;
}

interface IAchievementResponse {
  achievement_id: Types.ObjectId; // Corresponds to IAchievement.achievement_id
  rating: number;
  comment?: string;
}

interface IQuestionResponse {
  question_id: Types.ObjectId; // Corresponds to IQuestion.question_id
  answer: string;
}

interface IResponse {
  response_id: Types.ObjectId;
  provider_user_id: Types.ObjectId; // Ref 'User'
  submitted_at: Date;
  overall_rating?: number; // For Achievement type
  overall_comment?: string; // For Achievement type
  achievement_responses?: IAchievementResponse[]; // Only if Achievement type
  question_responses?: IQuestionResponse[]; // Only if General type
}

// --- Main FeedbackRequest Interface ---

export interface IFeedbackRequest extends Document {
  requester_user_id: Types.ObjectId; // Ref 'User'
  provider_user_id: Types.ObjectId; // Ref 'User'
  request_type: 'Achievement' | 'General';
  status: 'Pending' | 'Submitted' | 'Viewed'; // Or other relevant statuses
  period?: string; // For Achievement type
  created_at: Date;
  submitted_at?: Date; // When the *first* response is submitted? Or track per response? Let's assume first for now.
  achievements?: IAchievement[]; // Only if Achievement type
  questions?: IQuestion[]; // Only if General type
  responses?: IResponse[]; // Array to hold responses (though currently 1:1 in design)
}

// --- Embedded Schemas ---

const AchievementSchema = new Schema<IAchievement>({
  achievement_id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId(), required: true },
  description: { type: String, required: true },
  order: { type: Number, required: true },
}, { _id: false });

const QuestionSchema = new Schema<IQuestion>({
  question_id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId(), required: true },
  text: { type: String, required: true },
  order: { type: Number, required: true },
}, { _id: false });

const AchievementResponseSchema = new Schema<IAchievementResponse>({
  achievement_id: { type: Schema.Types.ObjectId, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
}, { _id: false });

const QuestionResponseSchema = new Schema<IQuestionResponse>({
  question_id: { type: Schema.Types.ObjectId, required: true },
  answer: { type: String, required: true },
}, { _id: false });

const ResponseSchema = new Schema<IResponse>({
   response_id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId(), required: true },
   provider_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
   submitted_at: { type: Date, default: Date.now },
   overall_rating: { type: Number, min: 1, max: 5 },
   overall_comment: { type: String },
   achievement_responses: [AchievementResponseSchema],
   question_responses: [QuestionResponseSchema],
}, { _id: false });


// --- Main FeedbackRequest Schema ---

const FeedbackRequestSchema: Schema<IFeedbackRequest> = new Schema(
  {
    requester_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    request_type: { type: String, enum: ['Achievement', 'General'], required: true },
    status: { type: String, enum: ['Pending', 'Submitted', 'Viewed'], default: 'Pending', required: true, index: true },
    period: { type: String },
    created_at: { type: Date, default: Date.now },
    submitted_at: { type: Date },
    achievements: [AchievementSchema],
    questions: [QuestionSchema],
    responses: [ResponseSchema], // Embed responses
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: true }, // Add default updated_at timestamp
  }
);

// Add conditional requirement logic if needed (e.g., achievements required if type is Achievement)
// Mongoose middleware could be used for more complex validation

// Prevent model overwrite during hot-reloading
const FeedbackRequest: Model<IFeedbackRequest> = models.FeedbackRequest || mongoose.model<IFeedbackRequest>('FeedbackRequest', FeedbackRequestSchema);

export default FeedbackRequest;