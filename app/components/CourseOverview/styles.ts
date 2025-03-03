import styled from 'styled-components';

export const Container = styled.div`
display: flex;
flex-direction: column;
gap: 2rem;
padding: 2rem;
max-width: 1200px;
margin: 0 auto;
`;

export const Header = styled.div`
display: flex;
justify-content: space-between;
align-items: flex-start;
gap: 2rem;
`;

export const CourseInfo = styled.div`
flex: 1;
h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
}
p {
    font-size: 1.1rem;
    color: #666;
    line-height: 1.6;
}
`;

export const ProgressBar = styled.div<{ progress: number }>`
width: 100%;
height: 8px;
background: #eee;
border-radius: 4px;
overflow: hidden;

&::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.progress}%;
    background: #4CAF50;
    transition: width 0.3s ease;
}
`;

export const ModuleList = styled.div`
display: flex;
flex-direction: column;
gap: 1rem;
`;

export const Module = styled.div`
background: #fff;
border-radius: 8px;
padding: 1.5rem;
box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

export const LessonList = styled.div`
margin-top: 1rem;
display: flex;
flex-direction: column;
gap: 0.5rem;
`;

export const Lesson = styled.div<{ completed: boolean }>`
display: flex;
align-items: center;
padding: 1rem;
background: ${props => props.completed ? '#f8fff8' : '#fff'};
border: 1px solid #eee;
border-radius: 4px;
cursor: pointer;

&:hover {
    background: #f5f5f5;
}
`;

