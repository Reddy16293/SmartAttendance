import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MobileTimetable } from '../../../src/components/timetable/MobileTimetable';
import { Colors } from '../../../src/constants/Colors';

export default function TimetableScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Time Table</Text>
        <Text style={styles.subtitle}>Your complete class schedule</Text>
      </View>
      <MobileTimetable userRole="student" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
    marginTop: 4,
  },
});

