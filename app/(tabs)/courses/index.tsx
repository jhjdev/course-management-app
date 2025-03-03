import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

// Mock data - replace with real data later
const mockCourses = [
{ id: '1', title: 'Introduction to Investing' },
{ id: '2', title: 'Stock Market Basics' },
{ id: '3', title: 'Personal Finance 101' },
];

export default function CoursesScreen() {
return (
    <View style={styles.container}>
    <FlatList
        data={mockCourses}
        renderItem={({ item }) => (
        <Link href={`/courses/${item.id}`} asChild>
            <Pressable style={styles.courseItem}>
            <Text style={styles.courseTitle}>{item.title}</Text>
            </Pressable>
        </Link>
        )}
        keyExtractor={(item) => item.id}
    />
    </View>
);
}

const styles = StyleSheet.create({
container: {
    flex: 1,
    padding: 16,
},
courseItem: {
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
    width: 0,
    height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
},
courseTitle: {
    fontSize: 16,
    fontWeight: '500',
},
});

