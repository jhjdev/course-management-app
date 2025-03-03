import { AccessibilityInfo, Platform } from 'react-native';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AccessibilityPreferences {
screenReaderEnabled: boolean;
fontScale: number;
highContrast: boolean;
reducedMotion: boolean;
boldText: boolean;
invertColors: boolean;
}

export interface AccessibilityState {
preferences: AccessibilityPreferences;
focusedElement: string | null;
announcements: string[];
}

class AccessibilityService {
private static instance: AccessibilityService;
private state: BehaviorSubject<AccessibilityState>;

private constructor() {
    this.state = new BehaviorSubject<AccessibilityState>({
    preferences: {
        screenReaderEnabled: false,
        fontScale: 1,
        highContrast: false,
        reducedMotion: false,
        boldText: false,
        invertColors: false
    },
    focusedElement: null,
    announcements: []
    });

    this.initializeAccessibilityListeners();
}

public static getInstance(): AccessibilityService {
    if (!AccessibilityService.instance) {
    AccessibilityService.instance = new AccessibilityService();
    }
    return AccessibilityService.instance;
}

private async initializeAccessibilityListeners(): Promise<void> {
    // Screen reader status
    const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
    this.updatePreference('screenReaderEnabled', screenReaderEnabled);

    AccessibilityInfo.addEventListener(
    'screenReaderChanged',
    this.handleScreenReaderChange
    );

    // Bold text status (iOS)
    if (Platform.OS === 'ios') {
    const boldTextEnabled = await AccessibilityInfo.isBoldTextEnabled();
    this.updatePreference('boldText', boldTextEnabled);

    AccessibilityInfo.addEventListener(
        'boldTextChanged',
        this.handleBoldTextChange
    );
    }

    // Reduced motion status
    const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
    this.updatePreference('reducedMotion', reduceMotionEnabled);

    AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    this.handleReduceMotionChange
    );
}

public getState(): Observable<AccessibilityState> {
    return this.state.asObservable();
}

public getCurrentState(): AccessibilityState {
    return this.state.getValue();
}

public setFontScale(scale: number): void {
    this.updatePreference('fontScale', scale);
}

public setHighContrast(enabled: boolean): void {
    this.updatePreference('highContrast', enabled);
}

public announce(message: string): void {
    AccessibilityInfo.announceForAccessibility(message);
    const currentState = this.state.getValue();
    this.state.next({
    ...currentState,
    announcements: [...currentState.announcements, message]
    });
}

public setAccessibilityFocus(elementId: string): void {
    const currentState = this.state.getValue();
    this.state.next({
    ...currentState,
    focusedElement: elementId
    });
}

public getAccessibilityProps(elementId: string, label: string): {
    accessible: boolean;
    accessibilityLabel: string;
    accessibilityHint?: string;
    accessibilityRole?: string;
} {
    return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: undefined,
    accessibilityRole: undefined
    };
}

private updatePreference<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
): void {
    const currentState = this.state.getValue();
    this.state.next({
    ...currentState,
    preferences: {
        ...currentState.preferences,
        [key]: value
    }
    });
}

private handleScreenReaderChange = (isEnabled: boolean): void => {
    this.updatePreference('screenReaderEnabled', isEnabled);
};

private handleBoldTextChange = (isEnabled: boolean): void => {
    this.updatePreference('boldText', isEnabled);
};

private handleReduceMotionChange = (isEnabled: boolean): void => {
    this.updatePreference('reducedMotion', isEnabled);
};

public cleanup(): void {
    AccessibilityInfo.removeEventListener(
    'screenReaderChanged',
    this.handleScreenReaderChange
    );

    if (Platform.OS === 'ios') {
    AccessibilityInfo.removeEventListener(
        'boldTextChanged',
        this.handleBoldTextChange
    );
    }

    AccessibilityInfo.removeEventListener(
    'reduceMotionChanged',
    this.handleReduceMotionChange
    );
}
}

export default AccessibilityService;

