import mongoose, { Document, Schema, Types } from 'mongoose';

// Progress interface for TypeScript
export interface IProgress {
user: Types.ObjectId;
course: Types.ObjectId;
completionPercentage: number;
completedSections: Types.ObjectId[];
lastAccessedSection?: Types.ObjectId;
lastAccessedAt: Date;
completedAt?: Date;
}

// Interface for the Progress document
export interface IProgressDocument extends IProgress, Document {
createdAt: Date;
updatedAt: Date;
}

// Progress schema definition
const progressSchema = new Schema<IProgressDocument>(
{
    user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    },
    course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    },
    completionPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0,
    },
    completedSections: [{
    type: Schema.Types.ObjectId,
    ref: 'Section',
    }],
    lastAccessedSection: {
    type: Schema.Types.ObjectId,
    ref: 'Section',
    },
    lastAccessedAt: {
    type: Date,
    required: true,
    default: Date.now,
    },
    completedAt: {
    type: Date,
    },
},
{
    timestamps: true,
}
);

// Indexes for efficient querying
progressSchema.index({ user: 1, course: 1 }, { unique: true });
progressSchema.index({ user: 1, completionPercentage: 1 });
progressSchema.index({ course: 1, completionPercentage: 1 });
progressSchema.index({ lastAccessedAt: -1 });

// Export the Progress model
const Progress = mongoose.model<IProgressDocument>('Progress', progressSchema);
export default Progress;

