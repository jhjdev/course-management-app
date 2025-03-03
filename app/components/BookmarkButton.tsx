import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { toggleBookmarkId, selectIsBookmarked } from '../stores/slices/bookmarkSlice';

interface BookmarkButtonProps {
itemId: string;
style?: ViewStyle;
size?: number;
}

export const BookmarkButton = ({ itemId, style, size = 24 }: BookmarkButtonProps) => {
const dispatch = useAppDispatch();
const isBookmarked = useAppSelector(state => selectIsBookmarked(state, itemId));

const handlePress = () => {
    dispatch(toggleBookmarkId(itemId));
};

return (
    <Pressable
    style={[styles.container, style]}
    onPress={handlePress}
    hitSlop={8}
    >
    <Ionicons
        name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
        size={size}
        color={isBookmarked ? '#007AFF' : '#666666'}
    />
    </Pressable>
);
};

const styles = StyleSheet.create({
container: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
},
});

