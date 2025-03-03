import mongoose, { Schema, Document } from 'mongoose';

interface Lesson {
title: string;
description: string;
duration: number;  // in minutes
order: number;
content: string;
videoUrl?: string;
resources?: string[];
isCompleted?: boolean;
}

interface Section {
title: string;
description: string;
order: number;
lessons: Lesson[];
}

export interface ICourse {
title: string;
description: string;
code: string;
category: string;
subCategory?: string;
difficulty: 'beginner' | 'intermediate' | 'advanced';
creator: mongoose.Types.ObjectId;
maxStudents?: number;
startDate: Date;
endDate: Date;
status: 'draft' | 'published' | 'archived';
enrolledStudents: mongoose.Types.ObjectId[];
price: number;
currency: string;
language: string;
tags: string[];
ratings: {
    userId: mongoose.Types.ObjectId;
    rating: number;
    review?: string;
    createdAt: Date;
}[];
averageRating: number;
enrollmentCount: number;
thumbnail?: string;
objectives: string[];
prerequisites?: string[];
lastUpdated: Date;
duration: number; // in minutes
completionRate: number;
createdAt: Date;
updatedAt: Date;
}

export interface ICourseDocument extends ICourse, Document {
isEnrollmentOpen(): boolean;
hasAvailableSpots(): boolean;
enrollStudent(studentId: mongoose.Types.ObjectId): Promise<void>;
unenrollStudent(studentId: mongoose.Types.ObjectId): Promise<void>;
addRating(userId: mongoose.Types.ObjectId, rating: number, review?: string): Promise<void>;
updateRating(userId: mongoose.Types.ObjectId, rating: number, review?: string): Promise<void>;
removeRating(userId: mongoose.Types.ObjectId): Promise<void>;
calculateCompletionRate(): number;
updateLastActivity(): Promise<void>;
isEligibleForCertificate(userId: mongoose.Types.ObjectId): Promise<boolean>;
getProgress(userId: mongoose.Types.ObjectId): Promise<number>;
getEnrollmentAnalytics(): Promise<{
    totalEnrolled: number;
    activeStudents: number;
    completionRate: number;
    averageProgress: number;
}>;
updateStudentProgress(userId: mongoose.Types.ObjectId, lessonId: mongoose.Types.ObjectId, completed: boolean): Promise<void>;
generateCertificate(userId: mongoose.Types.ObjectId): Promise<string>;
getStudentAnalytics(userId: mongoose.Types.ObjectId): Promise<{
    progress: number;
    timeSpent: number;
    lastAccessed: Date;
    completedLessons: number;
    certificateEligible: boolean;
}>;
}

export interface ICourseModel extends Model<ICourseDocument> {
findByCategory(category: string): Promise<ICourseDocument[]>;
findPublished(): Promise<ICourseDocument[]>;
findByCreator(creatorId: mongoose.Types.ObjectId): Promise<ICourseDocument[]>;
findByTags(tags: string[]): Promise<ICourseDocument[]>;
findByPriceRange(min: number, max: number): Promise<ICourseDocument[]>;
findPopular(): Promise<ICourseDocument[]>;
findNew(): Promise<ICourseDocument[]>;
findTrending(): Promise<ICourseDocument[]>;
findByLanguage(language: string): Promise<ICourseDocument[]>;
findSimilar(courseId: mongoose.Types.ObjectId): Promise<ICourseDocument[]>;
findWithProgressForUser(userId: mongoose.Types.ObjectId): Promise<ICourseDocument[]>;
}

const lessonSchema = new Schema({
title: { type: String, required: true, trim: true, maxlength: 200 },
description: { type: String, required: true, trim: true },
duration: { type: Number, required: true, min: 0 },
order: { type: Number, required: true },
content: { type: String, required: true },
videoUrl: { type: String, trim: true },
resources: [{ type: String }],
isCompleted: { type: Boolean, default: false }
});

const sectionSchema = new Schema({
title: { type: String, required: true, trim: true, maxlength: 200 },
description: { type: String, required: true, trim: true },
order: { type: Number, required: true },
lessons: [lessonSchema]
});

const courseSchema = new Schema({
title: { 
    type: String, 
    required: [true, 'Course title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
},
description: { 
    type: String, 
    required: [true, 'Course description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long']
},
code: { 
    type: String, 
    required: [true, 'Course code is required'],
    unique: true,
    trim: true,
    uppercase: true
},
category: { 
    type: String, 
    required: [true, 'Course category is required'],
    index: true
},
subCategory: {
    type: String,
    trim: true,
    index: true
},
price: {
    type: Number,
    required: [true, 'Course price is required'],
    min: [0, 'Price cannot be negative'],
    default: 0,
    index: true
},
currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'USD',
    enum: {
        values: ['USD', 'EUR', 'GBP'],
        message: 'Invalid currency'
    }
},
language: {
    type: String,
    required: [true, 'Course language is required'],
    index: true
},
tags: [{
    type: String,
    trim: true
}],
ratings: [{
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    review: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
}],
averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    index: true
},
enrollmentCount: {
    type: Number,
    default: 0,
    min: 0,
    index: true
},
thumbnail: {
    type: String,
    trim: true
},
objectives: [{
    type: String,
    required: true,
    trim: true
}],
prerequisites: [{
    type: String,
    trim: true
}],
duration: {
    type: Number,
    required: [true, 'Course duration is required'],
    min: [1, 'Duration must be at least 1 minute']
},
completionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true
},
difficulty: {
    type: String,
    enum: {
    values: ['beginner', 'intermediate', 'advanced'],
    message: 'Invalid difficulty level'
    },
    required: true
},
creator: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: [true, 'Course creator is required'],
    index: true
},
maxStudents: {
    type: Number,
    min: [1, 'Maximum students must be at least 1']
},
startDate: {
    type: Date,
    required: [true, 'Start date is required']
},
endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
    validator: function(endDate: Date) {
        return endDate > this.startDate;
    },
    message: 'End date must be after start date'
    }
},
status: {
    type: String,
    enum: {
    values: ['draft', 'published', 'archived'],
    message: 'Invalid course status'
    },
    default: 'draft',
    index: true
},
enrolledStudents: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
}]
}, {
timestamps: true,
toJSON: { virtuals: true },
toObject: { virtuals: true }
});
}, {
timestamps: true,
toJSON: { virtuals: true },
toObject: { virtuals: true }
});

// Virtual fields
courseSchema.virtual('availableSpots').get(function() {
if (!this.maxStudents) return null;
return Math.max(0, this.maxStudents - this.enrolledStudents.length);
});

courseSchema.virtual('isFull').get(function() {
if (!this.maxStudents) return false;
return this.enrolledStudents.length >= this.maxStudents;
});

courseSchema.virtual('isEnrollmentOpen').get(function() {
const now = new Date();
return this.status === 'published' && 
        now >= this.startDate && 
        now <= this.endDate &&
        !this.isFull;
});

// Instance methods
courseSchema.methods.hasAvailableSpots = function(): boolean {
if (!this.maxStudents) return true;
return this.enrolledStudents.length < this.maxStudents;
};

courseSchema.methods.enrollStudent = async function(studentId: mongoose.Types.ObjectId): Promise<void> {
if (!this.hasAvailableSpots()) {
    throw new Error('Course is full');
}
if (this.enrolledStudents.includes(studentId)) {
    throw new Error('Student already enrolled');
}
this.enrolledStudents.push(studentId);
await this.save();
};

courseSchema.methods.unenrollStudent = async function(studentId: mongoose.Types.ObjectId): Promise<void> {
const index = this.enrolledStudents.indexOf(studentId);
if (index === -1) {
    throw new Error('Student not enrolled in this course');
}
this.enrolledStudents.splice(index, 1);
await this.save();
};

// Calculate and update average rating
courseSchema.methods.calculateAverageRating = function() {
if (this.ratings.length === 0) {
    this.averageRating = 0;
    return;
}
const sum = this.ratings.reduce((total, rating) => total + rating.rating, 0);
this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
};

// Pre-save middleware to update average rating
courseSchema.pre('save', function(next) {
if (this.isModified('ratings')) {
    this.calculateAverageRating();
    this.lastUpdated = new Date();
}
next();
});

// Indexes
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ category: 1, status: 1 });
courseSchema.index({ creator: 1, status: 1 });
courseSchema.index({ status: 1, startDate: 1, endDate: 1 });

// Static methods
courseSchema.statics.findByCategory = function(category: string): Promise<ICourseDocument[]> {
return this.find({ category, status: 'published' });
};

courseSchema.statics.findPublished = function(): Promise<ICourseDocument[]> {
return this.find({ status: 'published' });
};

courseSchema.statics.findByCreator = function(creatorId: mongoose.Types.ObjectId): Promise<ICourseDocument[]> {
return this.find({ creator: creatorId });
};

// Pre-save hooks
courseSchema.pre('save', function(next) {
if (this.isModified('startDate') || this.isModified('endDate')) {
    if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
    return;
    }
}
next();
});
// Text search indexes
courseSchema.index({ 
title: 'text', 
description: 'text', 
tags: 'text' 
}, {
weights: {
    title: 10,
    tags: 5,
    description: 3
}
});

// Compound indexes for common queries
courseSchema.index({ category: 1, subCategory: 1, status: 1 });
courseSchema.index({ creator: 1, status: 1 });
courseSchema.index({ price: 1, status: 1 });
courseSchema.index({ averageRating: -1, enrollmentCount: -1 });
courseSchema.index({ 'ratings.userId': 1, _id: 1 });
courseSchema.index({ difficulty: 1, language: 1, status: 1 });

export default mongoose.model<ICourseDocument, ICourseModel>('Course', courseSchema);

