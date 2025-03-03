import { StyleSheet } from 'react-native';
import { View } from '@/src/components/Themed';
import { Text } from '@/src/components/Themed';

export default function HomeScreen() {
return (
    <View style={styles.container}>
    <View style={styles.welcomeSection}>
        <Text style={styles.title}>Welcome to Female Invest</Text>
        <Text style={styles.subtitle}>Your journey to financial freedom starts here</Text>
    </View>

    <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Featured Courses</Text>
        {/* Placeholder for featured courses */}
        <View style={styles.placeholderCard}>
        <Text>Investment Basics 101</Text>
        </View>
        <View style={styles.placeholderCard}>
        <Text>Stock Market Fundamentals</Text>
        </View>
    </View>

    <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Your Progress</Text>
        {/* Placeholder for progress tracking */}
        <View style={styles.placeholderProgress}>
        <Text>Continue where you left off</Text>
        </View>
    </View>
    </View>
);
}

const styles = StyleSheet.create({
container: {
    flex: 1,
    padding: 20,
},
welcomeSection: {
    marginBottom: 30,
},
title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
},
subtitle: {
    fontSize: 16,
    opacity: 0.8,
},
featuredSection: {
    marginBottom: 30,
},
sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
},
placeholderCard: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
},
progressSection: {
    flex: 1,
},
placeholderProgress: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
},
});

