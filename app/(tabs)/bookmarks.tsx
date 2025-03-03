import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { BookmarkButton } from '../../src/components';
import { useAppSelector } from '../../src/hooks/redux';

type SampleItem = {
id: string;
title: string;
description: string;
};

const sampleItems: SampleItem[] = [
{ id: '1', title: 'First Item', description: 'This is the first sample item' },
{ id: '2', title: 'Second Item', description: 'This is the second sample item' },
{ id: '3', title: 'Third Item', description: 'This is the third sample item' },
{ id: '4', title: 'Fourth Item', description: 'This is the fourth sample item' },
];

export default function BookmarksScreen() {
const theme = useTheme();
const bookmarkedIds = useAppSelector((state) => state.bookmarks.bookmarkedIds);

const bookmarkedItems = sampleItems.filter((item) => bookmarkedIds.includes(item.id));

const ItemCard = ({ item }: { item: SampleItem }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
    <View style={styles.cardHeader}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
        <BookmarkButton itemId={item.id} />
    </View>
    <Text style={[styles.description, { color: theme.colors.text }]}>
        {item.description}
    </Text>
    </View>
);

return (
    <ScrollView 
    style={[styles.container, { backgroundColor: theme.colors.background }]}
    contentContainerStyle={styles.content}
    >
    <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Available Items
        </Text>
        {sampleItems.map((item) => (
        <ItemCard key={item.id} item={item} />
        ))}
    </View>

    <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Bookmarked Items ({bookmarkedItems.length})
        </Text>
        {bookmarkedItems.length > 0 ? (
        bookmarkedItems.map((item) => (
            <ItemCard key={item.id} item={item} />
        ))
        ) : (
        <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            No bookmarked items yet
        </Text>
        )}
    </View>
    </ScrollView>
);
}

const styles = StyleSheet.create({
container: {
    flex: 1,
},
content: {
    padding: 16,
},
section: {
    marginBottom: 24,
},
sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
},
card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
},
cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
},
title: {
    fontSize: 16,
    fontWeight: '600',
},
description: {
    fontSize: 14,
    opacity: 0.8,
},
emptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
},
});

