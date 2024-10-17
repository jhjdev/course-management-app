import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import {
  coursesAtom,
  isLoadingAtom,
  fetchCoursesAtom,
} from '@/stores/courseStore';
import CourseCard from '../../components/CourseCard';

interface Lesson {
  id: string;
  name: string;
  duration: number;
}

interface Course {
  id: string;
  name: string;
  description: string;
  lessons: Lesson[];
  coverImage: string;
  duration: number;
}

export default function TabOneScreen() {
  const [courses] = useAtom(coursesAtom);
  const [isLoading] = useAtom(isLoadingAtom);
  const [, fetchCourses] = useAtom(fetchCoursesAtom);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const startedCourses = courses.filter((course) => course.id === 'courseId1'); // Placeholder for demo
  const notStartedCourses = courses.filter(
    (course) => course.id !== 'courseId1'
  );
  return (
    <View
      className="flex-1 items-center justify-center bg-white"
      style={styles.container}
    >
      {/* <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
      <EditScreenInfo path="app/(tabs)/index.tsx" /> */}
      <ScrollView className="p-5">
        {/* Started Courses Section */}
        <View className="mb-6">
          <Text className="text-2xl font-bold mb-3">Continue Learning</Text>
          <FlatList
            horizontal
            data={startedCourses}
            renderItem={({ item }) => (
              <CourseCard
                courseId={item.id} // Pass the courseId prop here
                imageUrl={
                  item.coverImage.endsWith('.jpg')
                    ? item.coverImage
                    : `${item.coverImage}.jpg`
                }
                title={item.name}
                lessons={item.lessons.length}
                duration={item.duration}
                completedPercent={45} // Assuming 45% completed for demo
              />
            )}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        {/* Not Started Courses Section */}
        <View className="mb-6">
          <Text className="text-2xl font-bold mb-3">You might also like</Text>
          <FlatList
            horizontal
            data={notStartedCourses}
            renderItem={({ item }) => (
              <CourseCard
                courseId={item.id} // Pass the courseId prop here
                imageUrl={
                  item.coverImage.endsWith('.jpg')
                    ? item.coverImage
                    : `${item.coverImage}.jpg`
                }
                title={item.name}
                lessons={item.lessons.length}
                duration={item.duration}
              />
            )}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
