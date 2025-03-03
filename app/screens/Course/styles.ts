import styled from 'styled-components/native';
import { theme } from '../../theme';

export const Container = styled.View`
flex: 1;
background-color: ${theme.colors.background};
`;

export const Content = styled.View`
flex: 1;
padding: ${theme.spacing.medium}px;
gap: ${theme.spacing.medium}px;

@media (min-width: ${theme.breakpoints.tablet}px) {
    flex-direction: row;
    padding: ${theme.spacing.large}px;
}
`;

export const ErrorContainer = styled.View`
flex: 1;
justify-content: center;
align-items: center;
padding: ${theme.spacing.large}px;
background-color: ${theme.colors.error.light};
`;

export const ErrorText = styled.Text`
color: ${theme.colors.error.dark};
font-size: ${theme.typography.sizes.body}px;
text-align: center;
`;

