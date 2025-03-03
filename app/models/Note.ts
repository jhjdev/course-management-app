import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INote extends Document {
content: string;
user: Types.ObjectId;
course: Types.ObjectId;
section?: Types.ObjectId;
position: number;
createdAt: Date;
updatedAt: Date;
}

const noteSchema = new Schema<INote>(
{
    content: {
    type: String,
    required: true,
    trim: true,
    },
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
    section: {
    type: Schema.Types.ObjectId,
    ref: 'Section',
    },
    position: {
    type: Number,
    default: 0,
    },
},
{
    timestamps: true,
}
);

// Create compound indexes for efficient querying
noteSchema.index({ user: 1, course: 1 });
noteSchema.index({ user: 1, section: 1 });
noteSchema.index({ course: 1, position: 1 });

const Note = mongoose.model<INote>('Note', noteSchema);

export default Note;

