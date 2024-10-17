import { BookmarkRepo } from '../core/requirements/BookmarkRepo';
import { CourseRepo } from '../core/requirements/CourseRepo';
import { MockBookmarkRepo } from './MockBookmarkRepo';
import { MockCourseRepo } from './MockCourseRepo';
import { randImg } from '@ngneat/falso';

const initialCourses = [
  {
    id: 'courseId0',
    name: 'Personal Finance',
    description: 'Learn how to manage your personal finance',
    started: false,
    bookmarked: true,
    lessons: [
      {
        id: 'courseId0_lessonId0',
        name: 'Introduction to Personal Finance',
        duration: 3_600,
        completed: false,
      },
      {
        id: 'courseId0_lessonId1',
        name: 'Budgeting',
        duration: 4_800,
        completed: false,
      },
    ],
    coverImage: randImg({ width: 200, height: 200 }),
  },
  {
    id: 'courseId1',
    name: 'Intro to investing',
    description: 'Learn how to invest in the stock market',
    started: true,
    bookmarked: true,
    lessons: [
      {
        id: 'courseId1_lessonId0',
        name: 'What is a stock?',
        duration: 1_800,
        completed: true,
      },
      {
        id: 'courseId1_lessonId1',
        name: 'What is a bond?',
        duration: 2_400,
        completed: false,
      },
      {
        id: 'courseId1_lessonId1',
        name: 'What is the stock market?',
        duration: 3_600,
        completed: false,
      },
    ],
    coverImage: randImg({ width: 200, height: 200 }),
  },
  {
    id: 'courseId2',
    name: 'Budgeting',
    description: 'Learn how to budget',
    started: false,
    bookmarked: true,
    lessons: [
      {
        id: 'courseId2_lessonId0',
        name: 'What is a budget?',
        duration: 1_800,
        completed: false,
      },
      {
        id: 'courseId2_lessonId1',
        name: '3 rules of budgeting',
        duration: 2_400,
        completed: false,
      },
      {
        id: 'courseId2_lessonId1',
        name: 'How to budget?',
        duration: 7_200,
        completed: false,
      },
    ],
    coverImage: randImg({ width: 200, height: 200 }),
  },
  {
    id: 'courseId3',
    name: 'Retirement',
    description: 'Learn how to retire',
    started: false,
    bookmarked: false,
    lessons: [
      {
        id: 'courseId3_lessonId0',
        name: 'What is retirement?',
        duration: 1_800,
        completed: false,
      },
      {
        id: 'courseId3_lessonId1',
        name: 'How to retire?',
        duration: 4_800,
        completed: false,
      },
    ],
    coverImage: randImg({ width: 200, height: 200 }),
  },
  {
    id: 'courseId4',
    name: 'Setting up savings account',
    description: 'Learn how to set up a savings account',
    started: false,
    bookmarked: false,
    lessons: [
      {
        id: 'courseId4_lessonId0',
        name: 'What is a savings account?',
        duration: 1_800,
        completed: false,
      },
      {
        id: 'courseId4_lessonId1',
        name: 'How to manage a savings account?',
        duration: 7_200,
        completed: false,
      },
    ],
    coverImage: randImg({ width: 200, height: 200 }),
  },
];

export class MockRepos {
  bookmarks: BookmarkRepo;
  courses: CourseRepo;

  constructor() {
    this.bookmarks = new MockBookmarkRepo();
    this.courses = new MockCourseRepo(initialCourses);
  }
}
