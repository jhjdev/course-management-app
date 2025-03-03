import { ColorSchemeName, Appearance, Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
primary: string;
secondary: string;
background: string;
surface: string;
text: string;
textSecondary: string;
error: string;
success: string;
warning: string;
info: string;
border: string;
divider: string;
}

export interface ThemeTypography {
h1: {
    fontSize: number;
    lineHeight: number;
    fontWeight: string;
    fontFamily?: string;
};
h2: {
    fontSize: number;
    lineHeight: number;
    fontWeight: string;
    fontFamily?: string;
};
body: {
    fontSize: number;
    lineHeight: number;
    fontFamily?: string;
};
button: {
    fontSize: number;
    lineHeight: number;
    fontWeight: string;
    fontFamily?: string;
};
}

export interface ThemeSpacing {
xs: number;
sm: number;
md: number;
lg: number;
xl: number;
}

export interface Theme {
colors: ThemeColors;
typography: ThemeTypography;
spacing: ThemeSpacing;
borderRadius: {
    sm: number;
    md: number;
    lg: number;
};
shadows: {
    light: string;
    medium: string;
    strong: string;
};
}

class ThemeService {
private currentTheme: Theme;
private systemTheme: ColorSchemeName;
private static instance: ThemeService;
private themeListeners: Set<(theme: Theme) => void>;

private constructor() {
    this.themeListeners = new Set();
    this.systemTheme = Appearance.getColorScheme();
    this.currentTheme = this.getDefaultTheme();

    Appearance.addChangeListener(({ colorScheme }) => {
    this.systemTheme = colorScheme;
    this.updateTheme();
    });
}

static getInstance(): ThemeService {
    if (!ThemeService.instance) {
    ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
}

private getDefaultTheme(): Theme {
    return {
    colors: this.systemTheme === 'dark' ? this.getDarkColors() : this.getLightColors(),
    typography: this.getDefaultTypography(),
    spacing: this.getDefaultSpacing(),
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 16,
    },
    shadows: Platform.select({
        ios: {
        light: '0 2px 4px rgba(0,0,0,0.1)',
        medium: '0 4px 6px rgba(0,0,0,0.1)',
        strong: '0 10px 15px rgba(0,0,0,0.1)',
        },
        android: {
        light: '0 2px 4px rgba(0,0,0,0.15)',
        medium: '0 4px 6px rgba(0,0,0,0.15)',
        strong: '0 10px 15px rgba(0,0,0,0.15)',
        },
    }),
    };
}

private getLightColors(): ThemeColors {
    return {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#8E8E93',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    info: '#5856D6',
    border: '#C6C6C8',
    divider: '#C6C6C8',
    };
}

private getDarkColors(): ThemeColors {
    return {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    error: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',
    info: '#5E5CE6',
    border: '#38383A',
    divider: '#38383A',
    };
}

private getDefaultTypography(): ThemeTypography {
    const scale = Dimensions.get('window').scale;
    return {
    h1: {
        fontSize: 34 / scale,
        lineHeight: 41 / scale,
        fontWeight: 'bold',
    },
    h2: {
        fontSize: 28 / scale,
        lineHeight: 34 / scale,
        fontWeight: '600',
    },
    body: {
        fontSize: 17 / scale,
        lineHeight: 22 / scale,
    },
    button: {
        fontSize: 17 / scale,
        lineHeight: 22 / scale,
        fontWeight: '600',
    },
    };
}

private getDefaultSpacing(): ThemeSpacing {
    return {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    };
}

async updateTheme(customTheme?: Partial<Theme>): Promise<void> {
    this.currentTheme = {
    ...this.getDefaultTheme(),
    ...customTheme,
    };

    await AsyncStorage.setItem('theme', JSON.stringify(customTheme));
    this.notifyListeners();
}

private notifyListeners(): void {
    this.themeListeners.forEach(listener => listener(this.currentTheme));
}

subscribeToThemeChanges(listener: (theme: Theme) => void): () => void {
    this.themeListeners.add(listener);
    return () => this.themeListeners.delete(listener);
}

async loadSavedTheme(): Promise<void> {
    try {
    const savedTheme = await AsyncStorage.getItem('theme');
    if (savedTheme) {
        await this.updateTheme(JSON.parse(savedTheme));
    }
    } catch (error) {
    console.error('Error loading saved theme:', error);
    }
}

getCurrentTheme(): Theme {
    return this.currentTheme;
}

isSystemDarkMode(): boolean {
    return this.systemTheme === 'dark';
}

setScale(scale: number): void {
    const typography = this.currentTheme.typography;
    Object.keys(typography).forEach(key => {
    typography[key as keyof ThemeTypography].fontSize *= scale;
    typography[key as keyof ThemeTypography].lineHeight *= scale;
    });
    this.updateTheme({ typography });
}
}

export default ThemeService;

