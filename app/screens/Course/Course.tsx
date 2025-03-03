import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { CoursePlayer } from '../../components/CoursePlayer/CoursePlayer';
import { CourseProgress } from '../../components/CourseProgress/CourseProgress';
import { CourseHeader } from '../../components/CourseHeader/CourseHeader';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useCourseData } from '../../hooks/course/useCourseData';
import { CourseService } from '../../services/CourseService';
import { Container, Content, ErrorContainer, ErrorText } from './styles';

export type CourseScreenProps = {
courseId: string;
};

export const Course: React.FC<CourseScreenProps> = ({ courseId }) => {
const router = useRouter();
const { data: course, isLoading, error } = useCourseData(courseId);
const [currentSection, setCurrentSection] = useState<string | null>(null);

useEffect(() => {
    if (course?.sections?.length > 0 && !currentSection) {
    setCurrentSection(course.sections[0].id);
    }
}, [course]);

if (isLoading) {
    return (
    <Container>
        <LoadingSpinner />
    </Container>
    );
}

if (error || !course) {
    return (
    <ErrorContainer>
        <ErrorText>Failed to load course: {error?.message}</ErrorText>
    </ErrorContainer>
    );
}

const handleSectionComplete = async (sectionId: string) => {
    try {
    await CourseService.markSectionComplete(courseId, sectionId);
    // Refresh course data or update local state
    } catch (err) {
    console.error('Failed to mark section complete:', err);
    }
};

const handleSectionChange = (sectionId: string) => {
    setCurrentSection(sectionId);
};

return (
    <ErrorBoundary>
    <Container>
        <CourseHeader
        title={course.title}
        instructor={course.instructor}
        metadata={course.metadata}
        />
        <Content>
        <CoursePlayer
            courseId={courseId}
            sectionId={currentSection}
            onComplete={() => currentSection && handleSectionComplete(currentSection)}
        />
        <CourseProgress
            sections={course.sections}
            currentSection={currentSection}
            onSectionChange={handleSectionChange}
            completedSections={course.completedSections}
        />
        </Content>
    </Container>
    </ErrorBoundary>
);
};

