import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
Home: undefined;
Course: { courseId: string };
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type CourseScreenProps = NativeStackScreenProps<RootStackParamList, 'Course'>;

export interface User {
id: string;
email: string;
name: string;
avatar?: string;
enrolledCourses: string[]; // Array of course IDs
completedCourses: string[]; // Array of course IDs
}

export interface Course {
id: string;
title: string;
description: string;
category: CourseCategory;
duration: number; // in minutes
lessons: Lesson[];
thumbnail?: string;
instructor: string;
level: 'beginner' | 'intermediate' | 'advanced';
rating?: number;
enrolledCount?: number;
}

export interface Lesson {
id: string;
title: string;
duration: number; // in minutes
content: string;
videoUrl?: string;
completed: boolean;
}

export type CourseCategory = 
| 'investing_basics'
| 'stock_market'
| 'real_estate'
| 'cryptocurrency'
| 'personal_finance';

export interface UserProgress {
courseId: string;
completedLessons: string[]; // Array of lesson IDs
lastAccessedLessonId?: string;
startDate: string;
completionDate?: string;
}

export interface RootState {
courses: CoursesState;
user: UserState;
}

export interface CoursesState {
items: Course[];
loading: boolean;
error: string | null;
selectedCourse: Course | null;
}

export interface UserState {
currentUser: User | null;
progress: UserProgress[];
loading: boolean;
error: string | null;
}

