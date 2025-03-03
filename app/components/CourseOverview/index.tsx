import React, { useEffect, useState } from 'react';
import { Course, CourseOverviewProps } from './types';
import * as S from './styles';

const CourseOverview: React.FC<CourseOverviewProps> = ({
courseId,
onModuleSelect,
onLessonSelect,
}) => {
const [course, setCourse] = useState<Course | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
    const fetchCourse = async () => {
    try {
        setLoading(true);
        // Replace with actual API call
        const response = await fetch(`/api/courses/${courseId}`);
        const data = await response.json();
        setCourse(data);
    } catch (err) {
        setError('Failed to load course data');
    } finally {
        setLoading(false);
    }
    };

    fetchCourse();
}, [courseId]);

if (loading) return <div>Loading course...</div>;
if (error) return <div>Error: {error}</div>;
if (!course) return <div>Course not found</div>;

return (
    <S.Container>
    <S.Header>
        <S.CourseInfo>
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <div>
            <strong>Instructor: </strong>
            {course.instructor.name} - {course.instructor.title}
        </div>
        </S.CourseInfo>
        
        <div>
        <S.ProgressBar progress={course.progress.percentage} />
        <p>{course.progress.percentage}% Complete</p>
        </div>
    </S.Header>

    <S.ModuleList>
        {course.modules.map(module => (
        <S.Module key={module.id} onClick={() => onModuleSelect(module.id)}>
            <h2>{module.title}</h2>
            <p>{module.description}</p>
            <S.ProgressBar progress={module.progress} />
            
            <S.LessonList>
            {module.lessons.map(lesson => (
                <S.Lesson
                key={lesson.id}
                completed={lesson.isCompleted}
                onClick={(e) => {
                    e.stopPropagation();
                    onLessonSelect(lesson.id);
                }}
                >
                <div>
                    {lesson.title} - {lesson.duration} mins
                    {lesson.isCompleted && ' ✓'}
                </div>
                </S.Lesson>
            ))}
            </S.LessonList>
        </S.Module>
        ))}
    </S.ModuleList>
    </S.Container>
);
};

export default CourseOverview;

