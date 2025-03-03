import { ScrollView } from 'react-native';
import { Text, View } from '@/src/components/Themed';
import React from 'react';
import { FlatList } from 'react-native';
import { useAtom } from 'jotai';
import { bookmarkedCoursesAtom } from '@/src/stores/bookmarkStore';
import { coursesAtom } from '@/src/stores/courseStore';
import CourseCard from '../../src/components/CourseCard';

export default function TabTwoScreen() {
  const [bookmarkedCourses] = useAtom(bookmarkedCoursesAtom);
  const [courses] = useAtom(coursesAtom);

  // Filter the courses based on bookmarked status
  const bookmarkedCourseList = courses.filter(
    (course) => bookmarkedCourses[course.id]
  );

  // Log the filtered list to inspect the data structure
  console.log('Bookmarked Courses:', bookmarkedCourseList);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ScrollView className="p-5 w-full">
        {/* Started Courses Section */}
        <View className="mb-6">
          <Text className="text-2xl font-bold mb-3">My courses</Text>

          {bookmarkedCourseList.length === 0 ? (
            <Text style={{ color: '#6b7280', fontSize: 16 }}>
              No coureses saved yet.
            </Text>
          ) : (
            <FlatList
              data={bookmarkedCourseList}
              renderItem={({ item }) => {
                // Log each item to ensure it has the expected structure
                console.log('Rendering Course Item:', item);

                return (
                  <View style={{ flex: 1, margin: 8 }}>
                    <CourseCard
                      courseId={item.id}
                      imageUrl={
                        item.coverImage.endsWith('.jpg')
                          ? item.coverImage
                          : `${item.coverImage}.jpg`
                      }
                      title={item.name}
                      lessons={item.lessons.length}
                      duration={item.duration}
                    />
                  </View>
                );
              }}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
