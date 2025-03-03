import { Course, ICourse } from '../models/Course';
import { User } from '../models/User';
import { NotFoundError, ValidationError, AuthorizationError } from '../utils/errors';

export interface ICourseCreate {
title: string;
description: string;
code: string;
instructor: string;
maxStudents?: number;
startDate?: Date;
endDate?: Date;
}

export interface ICourseUpdate extends Partial<ICourseCreate> {}

export interface ICourseFilter {
status?: 'active' | 'draft' | 'archived';
instructor?: string;
startDate?: Date;
endDate?: Date;
search?: string;
}

export interface IPaginationOptions {
page?: number;
limit?: number;
sort?: string;
}

// Section Management
async addSection(courseId: string, sectionData: Omit<ICourseSection, 'id'>): Promise<ICourse> {
const course = await Course.findById(courseId);
if (!course) {
    throw new NotFoundError('Course not found');
}

const section = {
    ...sectionData,
    id: new mongoose.Types.ObjectId().toString(),
    status: 'draft'
};

course.sections = course.sections || [];
course.sections.push(section);
return await course.save();
}

async updateSection(courseId: string, sectionId: string, updateData: Partial<ICourseSection>): Promise<ICourse> {
const course = await Course.findById(courseId);
if (!course) {
    throw new NotFoundError('Course not found');
}

const sectionIndex = course.sections?.findIndex(s => s.id === sectionId);
if (sectionIndex === -1 || sectionIndex === undefined) {
    throw new NotFoundError('Section not found');
}

course.sections[sectionIndex] = {
    ...course.sections[sectionIndex],
    ...updateData
};

return await course.save();
}

async deleteSection(courseId: string, sectionId: string): Promise<ICourse> {
const course = await Course.findById(courseId);
if (!course) {
    throw new NotFoundError('Course not found');
}

course.sections = course.sections?.filter(s => s.id !== sectionId) || [];
return await course.save();
}

async reorderSections(courseId: string, sectionOrders: { id: string; order: number }[]): Promise<ICourse> {
const course = await Course.findById(courseId);
if (!course) {
    throw new NotFoundError('Course not found');
}

if (!course.sections) {
    throw new ValidationError('Course has no sections');
}

const updatedSections = [...course.sections];
sectionOrders.forEach(({ id, order }) => {
    const section = updatedSections.find(s => s.id === id);
    if (section) {
    section.order = order;
    }
});

course.sections = updatedSections.sort((a, b) => a.order - b.order);
return await course.save();
}

// Content Management
async addContent(courseId: string, sectionId: string, contentData: Omit<ICourseContent, 'id'>): Promise<ICourse> {
const course = await Course.findById(courseId);
if (!course) {
    throw new NotFoundError('Course not found');
}

const section = course.sections?.find(s => s.id === sectionId);
if (!section) {
    throw new NotFoundError('Section not found');
}

const content = {
    ...contentData,
    id: new mongoose.Types.ObjectId().toString()
};

section.content = section.content || [];
section.content.push(content);
return await course.save();
}

async updateContent(
courseId: string,
sectionId: string,
contentId: string,
updateData: Partial<ICourseContent>
): Promise<ICourse> {
const course = await Course.findById(courseId);
if (!course) {
    throw new NotFoundError('Course not found');
}

const section = course.sections?.find(s => s.id === sectionId);
if (!section) {
    throw new NotFoundError('Section not found');
}

const contentIndex = section.content?.findIndex(c => c.id === contentId);
if (contentIndex === -1 || contentIndex === undefined) {
    throw new NotFoundError('Content not found');
}

section.content[contentIndex] = {
    ...section.content[contentIndex],
    ...updateData
};

return await course.save();
}

async deleteContent(courseId: string, sectionId: string, contentId: string): Promise<ICourse> {
const course = await Course.findById(courseId);
if (!course) {
    throw new NotFoundError('Course not found');
}

const section = course.sections?.find(s => s.id === sectionId);
if (!section) {
    throw new NotFoundError('Section not found');
}

section.content = section.content?.filter(c => c.id !== contentId) || [];
return await course.save();
}

// Access Control
async checkAccess(courseId: string, userId: string): Promise<boolean> {
const course = await Course.findById(courseId);
if (!course) {
    throw new NotFoundError('Course not found');
}

if (course.instructor?.toString() === userId) {
    return true;
}

const user = await User.findById(userId).populate('groups');
if (!user) {
    throw new NotFoundError('User not found');
}

// Check if user is enrolled
if (course.enrolledStudents.includes(userId)) {
    return true;
}

// Check if user's groups have access
const userGroups = user.groups || [];
const hasGroupAccess = await Course.exists({
    _id: courseId,
    accessGroups: { $in: userGroups.map(g => g._id) }
});

return !!hasGroupAccess;
}

// Course Content Structure
async getCourseStructure(courseId: string): Promise<{
sections: ICourseSection[];
totalDuration: number;
contentCount: number;
}> {
const course = await Course.findById(courseId);
if (!course) {
    throw new NotFoundError('Course not found');
}

const sections = course.sections || [];
let totalDuration = 0;
let contentCount = 0;

sections.forEach(section => {
    section.content?.forEach(content => {
    if (content.duration) {
        totalDuration += content.duration;
    }
    contentCount++;
    });
});

return {
    sections,
    totalDuration,
    contentCount
};
}
async createCourse(courseData: ICourseCreate): Promise<ICourse> {
    const existingCourse = await Course.findOne({ code: courseData.code });
    if (existingCourse) {
    throw new ValidationError('Course code already exists');
    }

    const instructor = await User.findById(courseData.instructor);
    if (!instructor) {
    throw new NotFoundError('Instructor not found');
    }

    const course = new Course({
    ...courseData,
    status: 'draft',
    enrolledStudents: [],
    waitlist: []
    });

    return await course.save();
}

async getCourse(courseId: string): Promise<ICourse> {
    const course = await Course.findById(courseId)
    .populate('instructor', 'firstName lastName email')
    .populate('enrolledStudents', 'firstName lastName email');
    
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    return course;
}

async updateCourse(courseId: string, updateData: ICourseUpdate): Promise<ICourse> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    Object.assign(course, updateData);
    return await course.save();
}

async deleteCourse(courseId: string): Promise<void> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    if (course.enrolledStudents.length > 0) {
    throw new ValidationError('Cannot delete course with enrolled students');
    }

    await course.deleteOne();
}

async listCourses(filter: ICourseFilter = {}, options: IPaginationOptions = {}): Promise<{
    courses: ICourse[];
    total: number;
    page: number;
    pages: number;
}> {
    const query: any = {};
    
    if (filter.status) query.status = filter.status;
    if (filter.instructor) query.instructor = filter.instructor;
    if (filter.search) {
    query.$or = [
        { title: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } }
    ];
    }

    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
    Course.find(query)
        .populate('instructor', 'firstName lastName email')
        .sort(options.sort || '-createdAt')
        .skip(skip)
        .limit(limit),
    Course.countDocuments(query)
    ]);

    return {
    courses,
    total,
    page,
    pages: Math.ceil(total / limit)
    };
}

// Enrollment Management
async enrollStudent(courseId: string, studentId: string): Promise<ICourse> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    if (course.status !== 'active') {
    throw new ValidationError('Course is not active for enrollment');
    }

    if (course.enrolledStudents.includes(studentId)) {
    throw new ValidationError('Student already enrolled');
    }

    if (course.maxStudents && course.enrolledStudents.length >= course.maxStudents) {
    return await this.addToWaitlist(courseId, studentId);
    }

    course.enrolledStudents.push(studentId);
    return await course.save();
}

async unenrollStudent(courseId: string, studentId: string): Promise<ICourse> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    const studentIndex = course.enrolledStudents.indexOf(studentId);
    if (studentIndex === -1) {
    throw new ValidationError('Student not enrolled in this course');
    }

    course.enrolledStudents.splice(studentIndex, 1);
    await course.save();

    // Process waitlist if there are students waiting
    await this.processWaitlist(courseId);

    return course;
}

async addToWaitlist(courseId: string, studentId: string): Promise<ICourse> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    if (course.waitlist.includes(studentId)) {
    throw new ValidationError('Student already on waitlist');
    }

    course.waitlist.push(studentId);
    return await course.save();
}

async removeFromWaitlist(courseId: string, studentId: string): Promise<ICourse> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    const waitlistIndex = course.waitlist.indexOf(studentId);
    if (waitlistIndex === -1) {
    throw new ValidationError('Student not on waitlist');
    }

    course.waitlist.splice(waitlistIndex, 1);
    return await course.save();
}

async processWaitlist(courseId: string): Promise<ICourse> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    while (
    course.waitlist.length > 0 && 
    (!course.maxStudents || course.enrolledStudents.length < course.maxStudents)
    ) {
    const nextStudent = course.waitlist.shift();
    if (nextStudent) {
        course.enrolledStudents.push(nextStudent);
    }
    }

    return await course.save();
}

// Course Status Management
async publishCourse(courseId: string): Promise<ICourse> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    if (!course.instructor) {
    throw new ValidationError('Cannot publish course without an instructor');
    }

    course.status = 'active';
    return await course.save();
}

async archiveCourse(courseId: string): Promise<ICourse> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    course.status = 'archived';
    return await course.save();
}

async reactivateCourse(courseId: string): Promise<ICourse> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    if (course.status !== 'archived') {
    throw new ValidationError('Course is not archived');
    }

    course.status = 'active';
    return await course.save();
}

// Instructor Operations
async assignInstructor(courseId: string, instructorId: string): Promise<ICourse> {
    const [course, instructor] = await Promise.all([
    Course.findById(courseId),
    User.findById(instructorId)
    ]);

    if (!course) {
    throw new NotFoundError('Course not found');
    }

    if (!instructor) {
    throw new NotFoundError('Instructor not found');
    }

    if (instructor.role !== 'instructor') {
    throw new ValidationError('User is not an instructor');
    }

    course.instructor = instructorId;
    return await course.save();
}

async removeInstructor(courseId: string): Promise<ICourse> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new NotFoundError('Course not found');
    }

    if (course.status === 'active') {
    throw new ValidationError('Cannot remove instructor from active course');
    }

    course.instructor = undefined;
    return await course.save();
}
}

