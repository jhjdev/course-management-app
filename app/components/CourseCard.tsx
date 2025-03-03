// components/CourseCard.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAtom } from 'jotai';
import { LinearGradient } from 'expo-linear-gradient';
import { bookmarkedCoursesAtom } from '../stores/bookmarkStore';

interface CourseCardProps {
  courseId: string;
  imageUrl: string;
  title: string;
  lessons: number;
  duration: number;
  completedPercent?: number;
}

const CourseCard: React.FC<CourseCardProps> = ({
  courseId,
  imageUrl,
  title,
  lessons,
  duration,
  completedPercent,
}) => {
  const [bookmarkedCourses, setBookmarkedCourses] = useAtom(
    bookmarkedCoursesAtom
  );

  const isBookmarked = bookmarkedCourses[courseId] || false;

  const toggleBookmark = () => {
    const updatedBookmarkedCourses = {
      ...bookmarkedCourses,
      [courseId]: !isBookmarked,
    };
    setBookmarkedCourses(updatedBookmarkedCourses);
  };

  return (
    <View
      style={{
        width: 176,
        marginRight: 16,
        backgroundColor: 'white',
        borderRadius: 8,
        overflow: 'hidden',
        borderColor: isBookmarked ? 'black' : '#d1d5db',
        borderWidth: 1,
      }}
    >
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: 128 }}
        />
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.7)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: isBookmarked ? 'blue' : 'lightgray',
            borderColor: 'black',
            borderWidth: 1,
            borderRadius: 4,
            padding: 4,
          }}
          onPress={toggleBookmark}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color="black"
          />
        </TouchableOpacity>
      </View>
      <View style={{ padding: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{title}</Text>
        <Text>{lessons} lessons</Text>
        <Text>{duration} minutes</Text>
      </View>
    </View>
  );
};

export default CourseCard;
