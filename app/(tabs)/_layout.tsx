import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useClientOnlyValue } from '@/src/components/useClientOnlyValue';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
const colorScheme = useColorScheme();

return (
    <Tabs
    screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarStyle: {
        backgroundColor: Colors[colorScheme ?? 'light'].background,
        },
        headerStyle: {
        backgroundColor: Colors[colorScheme ?? 'light'].background,
        },
        headerTintColor: Colors[colorScheme ?? 'light'].text,
        headerShown: useClientOnlyValue(false, true),
    }}
    >
    <Tabs.Screen
        name="home"
        options={{
        title: 'Home',
        tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
    />
    <Tabs.Screen
        name="courses"
        options={{
        title: 'Courses',
        tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
        }}
    />
    <Tabs.Screen
        name="profile"
        options={{
        title: 'Profile',
        tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
    />
    </Tabs>
);
}
