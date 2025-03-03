import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
from { opacity: 0; }
to { opacity: 1; }
`;

export const Container = styled.div`
position: relative;
width: 100%;
max-width: 1200px;
margin: 0 auto;
background: #000;
border-radius: 8px;
overflow: hidden;
`;

export const VideoContainer = styled.div`
position: relative;
width: 100%;
padding-top: 56.25%; /* 16:9 Aspect Ratio */

video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}
`;

export const Controls = styled.div`
position: absolute;
bottom: 0;
left: 0;
right: 0;
padding: 16px;
background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
display: flex;
align-items: center;
gap: 12px;
opacity: 0;
transition: opacity 0.3s ease;

${Container}:hover & {
    opacity: 1;
}
`;

export const ProgressBar = styled.div`
flex: 1;
height: 4px;
background: rgba(255, 255, 255, 0.2);
border-radius: 2px;
cursor: pointer;
position: relative;

&:hover {
    height: 6px;
}
`;

export const ProgressFill = styled.div`
height: 100%;
background: #ff0000;
border-radius: 2px;
transition: width 0.1s linear;
`;

export const PlayButton = styled.button`
background: transparent;
border: none;
color: white;
cursor: pointer;
width: 40px;
height: 40px;
display: flex;
align-items: center;
justify-content: center;
transition: transform 0.2s ease;

&:hover {
    transform: scale(1.1);
}
`;

export const TimeDisplay = styled.div`
color: white;
font-size: 14px;
min-width: 100px;
text-align: center;
`;

export const VolumeControl = styled.input`
width: 80px;
height: 4px;
cursor: pointer;
appearance: none;
background: rgba(255, 255, 255, 0.2);
border-radius: 2px;

&::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
}
`;

export const FullscreenButton = styled.button`
background: transparent;
border: none;
color: white;
cursor: pointer;
padding: 8px;
transition: transform 0.2s ease;

&:hover {
    transform: scale(1.1);
}
`;

const spin = keyframes`
to { transform: rotate(360deg); }
`;

export const LoadingSpinner = styled.div`
position: absolute;
top: 50%;
left: 50%;
width: 40px;
height: 40px;
margin: -20px 0 0 -20px;
border: 4px solid rgba(255, 255, 255, 0.3);
border-radius: 50%;
border-top-color: white;
animation: ${spin} 1s linear infinite;
`;

export const ErrorContainer = styled.div`
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 24px;
background: #ff000020;
border-radius: 8px;
color: #ff0000;
animation: ${fadeIn} 0.3s ease;

button {
    margin-top: 12px;
    padding: 8px 16px;
    border: 1px solid #ff0000;
    border-radius: 4px;
    background: transparent;
    color: #ff0000;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
    background: #ff0000;
    color: white;
    }
}
`;

