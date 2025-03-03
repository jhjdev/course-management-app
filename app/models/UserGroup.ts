import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';
import { ICourse } from './Course';

export interface IUserGroup {
name: string;
description?: string;
users: Types.ObjectId[] | IUser[];
accessibleCourses: Types.ObjectId[] | ICourse[];
adminUsers: Types.ObjectId[] | IUser[];
createdAt: Date;
updatedAt: Date;
}

export interface IUserGroupDocument extends IUserGroup, Document {}

const userGroupSchema = new Schema<IUserGroupDocument>(
{
    name: {
    type: String,
    required: [true, 'Group name is required'],
    unique: true,
    trim: true,
    },
    description: {
    type: String,
    trim: true,
    },
    users: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    }],
    accessibleCourses: [{
    type: Schema.Types.ObjectId,
    ref: 'Course',
    }],
    adminUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    }],
},
{
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
}
);

// Create indexes
userGroupSchema.index({ name: 1 });

const UserGroup = mongoose.model<IUserGroupDocument>('UserGroup', userGroupSchema);

export default UserGroup;

