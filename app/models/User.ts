import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'instructor' | 'student';

export interface UserDocument extends Document {
email: string;
password: string;
firstName: string;
lastName: string;
fullName: string;
role: UserRole;
createdAt: Date;
updatedAt: Date;
comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema({
email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/, 'Please enter a valid email']
},
password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
},
firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [50, 'First name cannot exceed 50 characters']
},
lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
},
role: {
    type: String,
    enum: ['admin', 'instructor', 'student'],
    default: 'student'
}
}, {
    timestamps: true,
    strict: true,
    strictQuery: true,
    collection: 'users'
});

// Virtual for full name
userSchema.virtual('fullName').get(function(this: UserDocument) {
return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
if (!this.isModified('password')) return next();

try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
} catch (error) {
    next(error as Error);
}
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ name: 1 });
userSchema.index({ 'bookmarkedCourses': 1 });

export default mongoose.model<UserDocument>('User', userSchema);

