import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { ICourse } from './Course';

export interface IBookmark extends Document {
user: IUser['_id'];
course: ICourse['_id'];
tags?: string[];
notes?: string;
createdAt: Date;
}

const bookmarkSchema = new Schema({
user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
},
course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
},
tags: [{
    type: String,
    trim: true
}],
notes: {
    type: String,
    trim: true
}
}, {
timestamps: true
});

// Compound index for efficient querying of user's bookmarks
bookmarkSchema.index({ user: 1, course: 1 }, { unique: true });

export const Bookmark = mongoose.model<IBookmark>('Bookmark', bookmarkSchema);

