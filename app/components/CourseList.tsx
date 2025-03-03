import React, { useCallback, useState } from 'react';
import type { Course, ViewMode } from '../types';
import {
View,
Text,
FlatList,
ActivityIndicator,
StyleSheet,
Pressable,
RefreshControl,
useWindowDimensions,
} from 'react-native';
import { useCourses } from '../hooks/useCourses';
import { Ionicons } from '@expo/vector-icons';
import { CourseCard } from './CourseCard';
import { CourseSkeletonLoader } from './CourseSkeletonLoader';

interface Props {
initialViewMode?: ViewMode;
}

export const CourseList: React.FC<Props> = ({ initialViewMode = 'list' }) => {
const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
const { width } = useWindowDimensions();
const {
    courses,
    isLoading,
    error,
    refreshing,
    fetchCourses,
    toggleBookmark,
    isBookmarked,
    refresh
} = useCourses();

const handleRetry = useCallback(() => {
if (error) {
    dispatch(fetchCourses());
}
}, [dispatch, error]);

useEffect(() => {
dispatch(fetchCourses());
}, [dispatch]);

if (isLoading) {
return (
    <View style={styles.container}>
    <View style={styles.header}>
        <Pressable
        style={styles.viewModeButton}
        onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
        testID="view-mode-toggle"
        >
        <Ionicons 
            name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
            size={24}
            color="#007AFF" 
        />
        </Pressable>
    </View>
    <CourseSkeletonLoader 
        viewMode={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        testID="loading-skeleton"
    />
    </View>
);
}

if (error) {
return (
<View style={styles.container}>
    <View style={styles.errorContainer} testID="error-state">
    <Text style={styles.errorText}>{error}</Text>
    <Pressable 
        style={styles.retryButton}
        onPress={handleRetry}
        testID="retry-button"
    >
        <Text style={styles.retryText}>Try Again</Text>
    </Pressable>
    </View>
</View>
);
}

        const numColumns = viewMode === 'grid' ? 2 : 1;
        const renderCourseItem = useCallback(({ item }: { item: Course }) => (
        <CourseCard 
            course={item}
            isBookmarked={isBookmarked(item.id)}
            onToggleBookmark={() => toggleBookmark(item.id)}
            viewMode={viewMode}
            containerStyle={viewMode === 'grid' ? [styles.courseItem, { width: (width - 48) / 2 }] : styles.courseItem}
            testID={`course-item-${item.id}`}
        />
        ), [viewMode, width, isBookmarked, toggleBookmark]);

return (
    <FlatList
    data={courses}
    renderItem={renderCourseItem}
    keyExtractor={(item) => item.id}
    contentContainerStyle={styles.listContainer}
    numColumns={numColumns}
    columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
    refreshControl={
        <RefreshControl
        refreshing={refreshing}
        onRefresh={refresh}
        testID="refresh-control"
        />
    }
    ListHeaderComponent={
        <View style={styles.header}>
        <Pressable
            style={styles.viewModeButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            testID="view-mode-toggle"
        >
            <Ionicons 
            name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
            size={24}
            color="#007AFF" 
            />
        </Pressable>
        </View>
    }
    ListEmptyComponent={
    !isLoading && !error && (
        <View style={styles.centerContainer} testID="empty-state">
        <Text style={styles.emptyText}>No courses available at this time.</Text>
        <Pressable 
            style={styles.retryButton}
            onPress={handleRetry}
            testID="retry-button"
        >
            <Text style={styles.retryText}>Refresh</Text>
        </Pressable>
        </View>
    )
    }
    }
    />
);
};

const styles = StyleSheet.create({
container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
},
gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
},
header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e1e1e1',
    backgroundColor: '#fff',
},
viewModeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    ...Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    android: {
        elevation: 2,
    },
    }),
},
listContainer: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 16,
},
centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
},
errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
},
courseItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    android: {
        elevation: 3,
    },
    }),
},
courseContent: {
    flex: 1,
    padding: 16,
},
courseInfo: {
    flex: 1,
    justifyContent: 'space-between',
},
courseTitle: {
    fontSize: 17,
    fontWeight: Platform.select({ ios: '600', android: '700' }),
    marginBottom: 6,
    color: '#000',
},
courseDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
},
bookmarkButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
},
errorText: {
    color: Platform.select({ ios: '#FF3B30', android: '#B00020' }),
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.25,
},
retryButton: {
    backgroundColor: Platform.select({ ios: '#007AFF', android: '#1976D2' }),
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Platform.select({ ios: 10, android: 4 }),
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    android: {
        elevation: 2,
    },
    }),
},
retryText: {
    color: '#fff',
    fontSize: Platform.select({ ios: 16, android: 14 }),
    fontWeight: Platform.select({ ios: '600', android: '500' }),
    textAlign: 'center',
    letterSpacing: Platform.select({ ios: 0, android: 0.5 }),
},
emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    letterSpacing: 0.25,
},
});

