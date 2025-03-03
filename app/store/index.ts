import { configureStore, createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
persistStore,
persistReducer,
FLUSH,
REHYDRATE,
PAUSE,
PERSIST,
PURGE,
REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';

// Types
interface Course {
id: string;
title: string;
description: string;
imageUrl?: string;
author?: string;
duration?: string;
category?: string;
}

interface CoursesState {
items: Course[];
selectedCourseId: string | null;
loading: boolean;
error: string | null;
}

interface BookmarkState {
bookmarkedIds: string[];
}

// Initial states
const initialCoursesState: CoursesState = {
items: [],
selectedCourseId: null,
loading: false,
error: null,
};

const initialBookmarkState: BookmarkState = {
bookmarkedIds: [],
};

// Async thunks
export const fetchCourses = createAsyncThunk(
'courses/fetchCourses',
async () => {
    const response = await axios.get<Course[]>('https://api.example.com/courses');
    return response.data;
}
);

// Courses slice
const coursesSlice = createSlice({
name: 'courses',
initialState: initialCoursesState,
reducers: {
    selectCourse: (state, action: PayloadAction<string>) => {
    state.selectedCourseId = action.payload;
    },
    clearSelectedCourse: (state) => {
    state.selectedCourseId = null;
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
        state.error = action.error.message ?? 'Failed to fetch courses';
    });
},
});

// Bookmark slice
const bookmarkSlice = createSlice({
name: 'bookmarks',
initialState: initialBookmarkState,
reducers: {
    toggleBookmark: (state, action: PayloadAction<string>) => {
    const id = action.payload;
    const index = state.bookmarkedIds.indexOf(id);
    if (index === -1) {
        state.bookmarkedIds.push(id);
    } else {
        state.bookmarkedIds.splice(index, 1);
    }
    },
    clearBookmarks: (state) => {
    state.bookmarkedIds = [];
    },
},
});

// Root reducer
const rootReducer = {
courses: coursesSlice.reducer,
bookmarks: bookmarkSlice.reducer,
};

// Persist config
const persistConfig = {
key: 'root',
storage: AsyncStorage,
whitelist: ['bookmarks'], // Only persist bookmark state
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create store
export const store = configureStore({
reducer: persistedReducer,
middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
    serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
    },
    }),
});

// Create persistor
export const persistor = persistStore(store);

// Export actions
export const { selectCourse, clearSelectedCourse } = coursesSlice.actions;
export const { toggleBookmark, clearBookmarks } = bookmarkSlice.actions;

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Custom hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T,>(selector: (state: RootState) => T) => useSelector(selector);

// Selectors
export const selectCourses = (state: RootState) => state.courses.items;
export const selectSelectedCourseId = (state: RootState) => state.courses.selectedCourseId;
export const selectCoursesLoading = (state: RootState) => state.courses.loading;
export const selectCoursesError = (state: RootState) => state.courses.error;
export const selectBookmarkedIds = (state: RootState) => state.bookmarks.bookmarkedIds;
export const selectIsBookmarked = (state: RootState, id: string) => state.bookmarks.bookmarkedIds.includes(id);
export const selectBookmarkedCourses = (state: RootState) => 
state.courses.items.filter(course => state.bookmarks.bookmarkedIds.includes(course.id));
