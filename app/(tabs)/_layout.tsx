import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { colors, fonts } from "@/constants/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 67, paddingTop: 8, paddingBottom: 8, borderTopColor: colors.line, backgroundColor: colors.white },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 9, letterSpacing: 0 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Browse", tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="create" options={{ title: "Create", tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="my-tournaments" options={{ title: "My games", tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
