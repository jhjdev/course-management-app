import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from './index';
import axios from 'axios';

export interface Course {
id: string;
title: string;
description?: string;
imageUrl?: string;
createdAt: string;
updatedAt: string;
}

export interface CoursesState {
items: Course[];
loading: boolean;
error: string | null;
selectedCourse: Course | null;
}

const initialState: CoursesState = {
items: [],
loading: false,
error: null,
selectedCourse: null,
};

export const fetchCourses = createAsyncThunk(
'courses/fetchCourses',
async (_, { rejectWithValue }) => {
    try {
    const response = await axios.get('https://api.example.com/courses');
    return response.data as Course[];
    } catch (error) {
    return rejectWithValue('Failed to fetch courses');
    }
}
);

const coursesSlice = createSlice({
name: 'courses',
initialState,
reducers: {
    addCourse: (state, action: PayloadAction<Course>) => {
    state.items.push(action.payload);
    },
    updateCourse: (state, action: PayloadAction<Course>) => {
    const index = state.items.findIndex(course => course.id === action.payload.id);
    if (index !== -1) {
        state.items[index] = action.payload;
    }
    },
    removeCourse: (state, action: PayloadAction<string>) => {
    state.items = state.items.filter(course => course.id !== action.payload);
    },
    setSelectedCourse: (state, action: PayloadAction<Course | null>) => {
    state.selectedCourse = action.payload;
    },
},
extraReducers: (builder) => {
    builder
    .addCase(fetchCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
    })
    .addCase(fetchCourses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
    })
    .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
    });
},
});

// Selectors
export const selectCourses = (state: RootState) => state.courses.items;
export const selectCoursesLoading = (state: RootState) => state.courses.loading;
export const selectCoursesError = (state: RootState) => state.courses.error;
export const selectSelectedCourse = (state: RootState) => state.courses.selectedCourse;

export const { addCourse, updateCourse, removeCourse, setSelectedCourse } = coursesSlice.actions;
export default coursesSlice.reducer;

