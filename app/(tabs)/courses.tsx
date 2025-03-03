import { StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { View } from '@/src/components/Themed';
import { Text } from '@/src/components/Themed';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function CoursesScreen() {
const [searchQuery, setSearchQuery] = useState('');

// Placeholder course categories
const categories = [
    'Investing Basics',
    'Stock Market',
    'Real Estate',
    'Cryptocurrency',
    'Personal Finance'
];

return (
    <View style={styles.container}>
    <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
        style={styles.searchInput}
        placeholder="Search courses..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        />
    </View>

    <Text style={styles.sectionTitle}>Categories</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {categories.map((category, index) => (
        <Pressable key={index} style={styles.categoryChip}>
            <Text style={styles.categoryText}>{category}</Text>
        </Pressable>
        ))}
    </ScrollView>

    <Text style={styles.sectionTitle}>Featured Courses</Text>
    <ScrollView style={styles.coursesList}>
        {/* Placeholder course cards */}
        <Pressable style={styles.courseCard}>
        <View style={styles.courseImagePlaceholder} />
        <View style={styles.courseInfo}>
            <Text style={styles.courseTitle}>Investment Fundamentals</Text>
            <Text style={styles.courseDescription}>Learn the basics of investing and build your portfolio</Text>
            <Text style={styles.courseDuration}>8 lessons • 2.5 hours</Text>
        </View>
        </Pressable>

        <Pressable style={styles.courseCard}>
        <View style={styles.courseImagePlaceholder} />
        <View style={styles.courseInfo}>
            <Text style={styles.courseTitle}>Stock Market Mastery</Text>
            <Text style={styles.courseDescription}>Advanced techniques for stock market analysis</Text>
            <Text style={styles.courseDuration}>12 lessons • 4 hours</Text>
        </View>
        </Pressable>
    </ScrollView>
    </View>
);
}

const styles = StyleSheet.create({
container: {
    flex: 1,
    padding: 20,
},
searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
},
searchIcon: {
    marginRight: 10,
},
searchInput: {
    flex: 1,
    height: 40,
},
sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
},
categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 20,
},
categoryChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
},
categoryText: {
    fontSize: 14,
},
coursesList: {
    flex: 1,
},
courseCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
    width: 0,
    height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
},
courseImagePlaceholder: {
    height: 150,
    backgroundColor: '#e1e1e1',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
},
courseInfo: {
    padding: 15,
},
courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
},
courseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
},
courseDuration: {
    fontSize: 12,
    color: '#999',
},
});

