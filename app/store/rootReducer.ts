import { combineReducers } from '@reduxjs/toolkit';
import bookmarkReducer from './slices/bookmarkSlice';
import coursesReducer from './courses.slice';

export const rootReducer = combineReducers({
bookmarks: bookmarkReducer,
courses: coursesReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
