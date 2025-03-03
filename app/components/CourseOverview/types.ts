export interface Instructor {
id: string;
name: string;
title: string;
bio: string;
avatar: string;
contact: string;
}

export interface Lesson {
id: string;
title: string;
description: string;
duration: number;
contentType: 'video' | 'document' | 'quiz';
contentUrl: string;
isCompleted: boolean;
}

export interface Module {
id: string;
title: string;
description: string;
lessons: Lesson[];
progress: number;
isUnlocked: boolean;
}

export interface Progress {
completed: number;
total: number;
percentage: number;
lastAccessed: Date;
certificateEarned: boolean;
}

export interface Course {
id: string;
title: string;
description: string;
thumbnail: string;
instructor: Instructor;
modules: Module[];
progress: Progress;
startDate: Date;
endDate?: Date;
enrollmentStatus: 'open' | 'closed' | 'in-progress';
}

export interface CourseOverviewProps {
courseId: string;
onModuleSelect: (moduleId: string) => void;
onLessonSelect: (lessonId: string) => void;
}

