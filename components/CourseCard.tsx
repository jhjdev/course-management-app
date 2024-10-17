import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAtom } from 'jotai';
import { LinearGradient } from 'expo-linear-gradient';
import { bookmarkedCoursesAtom } from '@/stores/bookmarkStore';

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

  // Check if the course is bookmarked
  const isBookmarked = bookmarkedCourses[courseId] || false;

  // Toggle bookmark state in Jotai store
  const toggleBookmark = () => {
    setBookmarkedCourses((prev) => ({
      ...prev,
      [courseId]: !isBookmarked,
    }));
  };

  return (
    <View
      style={{
        width: 176,
        marginRight: 16,
        backgroundColor: 'white',
        borderRadius: 8,
        overflow: 'hidden',
        borderColor: '#d1d5db',
        borderWidth: 1,
      }}
    >
      {/* Course Image, Gradient Overlay, and Completion Badge */}
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: 128 }}
        />
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.7)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {completedPercent !== undefined && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              backgroundColor: '#ccf2d3',
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 12, color: 'black' }}>
              {completedPercent}% completed
            </Text>
          </View>
        )}

        {/* Bookmark Icon */}
        <TouchableOpacity
          onPress={toggleBookmark}
          style={{ position: 'absolute', top: 8, right: 8 }}
        >
          <Ionicons
            name="bookmark-outline"
            size={24}
            color={isBookmarked ? 'black' : 'gray'}
          />
        </TouchableOpacity>
      </View>

      {/* Course Info */}
      <Text
        style={{
          fontWeight: 'bold',
          fontSize: 16,
          marginTop: 8,
          paddingHorizontal: 12,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingBottom: 8,
        }}
      >
        <Text style={{ color: '#6b7280', fontSize: 14 }}>
          {lessons} lessons
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 14, marginHorizontal: 4 }}>
          •
        </Text>

        {/* Clock Icon and Duration */}
        <Ionicons
          name="time-outline"
          size={14}
          color="gray"
          style={{ marginRight: 4 }}
        />
        <Text style={{ color: '#6b7280', fontSize: 14 }}>{duration}h</Text>
      </View>
    </View>
  );
};

export default CourseCard;
