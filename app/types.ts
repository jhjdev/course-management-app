import { store } from './store';

/**
* Represents a course in the application
*/
export interface Course {
id: string;
title: string;
description: string;
imageUrl?: string;
author?: string;
duration?: number; // in minutes
category?: string;
createdAt?: string;
updatedAt?: string;
}

/**
* State type for the courses slice
*/
export interface CourseState {
items: Course[];
loading: boolean;
error: string | null;
selectedCourseId: string | null;
}

/**
* State type for the bookmarks slice
*/
export interface BookmarksState {
bookmarkedIds: string[];
loading: boolean;
error: string | null;
}

/**
* Combined root state type for the entire Redux store
*/
export interface RootState {
courses: CourseState;
bookmarks: BookmarksState;
}

/**
* Type for the dispatch function from the configured store
*/
export type AppDispatch = typeof store.dispatch;

