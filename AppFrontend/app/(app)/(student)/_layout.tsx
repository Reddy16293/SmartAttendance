import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Calendar, Layout, User, GraduationCap } from 'lucide-react-native';
import { Colors } from '../../../src/constants/Colors';
import { StudentSidebar, StudentSidebarButton } from '../../../src/components/navigation/StudentSidebar';

export default function StudentLayout() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const androidFallbackBottomInset = Platform.OS === 'android' ? 12 : 0;
  const bottomInset = Math.max(insets.bottom, androidFallbackBottomInset);

  return (
    <>
      <StudentSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <Tabs screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.mutedForeground,
        tabBarStyle: {
          height: 64 + bottomInset,
          paddingTop: 6,
          paddingBottom: 8 + bottomInset,
          borderTopColor: Colors.light.border,
          backgroundColor: Colors.light.card,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.light.card,
        },
        headerTintColor: Colors.light.text,
        headerTitleStyle: {
          fontWeight: 'bold',
          color: Colors.light.text,
        },
        headerLeft: () => <StudentSidebarButton onPress={() => setSidebarVisible(true)} />,
        headerLeftContainerStyle: {
          paddingLeft: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="enrollment"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color, size }) => <GraduationCap size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          title: 'Timetable',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="verify"
        options={{
          href: null,
        }}
      />
      </Tabs>
    </>
  );
}
