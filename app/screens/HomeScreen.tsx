import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import axios from 'axios';
import { HomeScreenProps } from '../types';

const fetchCourses = async () => {
  try {
    const response = await axios.get('https://api.example.com/courses'); // Replace with the correct API URL
    console.log(response.data);
    // Update your state with the fetched data
  } catch (error) {
    console.error('Failed to fetch courses:', error);
  }
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <View>
      <Text>Home Screen</Text>
      <Button
        title="Go to Course"
        onPress={() => navigation.navigate('Course')}
      />
      {/* Render your courses list here */}
    </View>
  );
};

export default HomeScreen;
