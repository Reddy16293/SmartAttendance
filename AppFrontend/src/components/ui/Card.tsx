import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors } from '../../constants/Colors';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function CardHeader({ children, style }: CardProps) {
  return (
    <View style={[styles.header, style]}>
      {children}
    </View>
  );
}

export function CardTitle({ children, style }: { children: React.ReactNode, style?: any }) {
  return (
    <Text style={[styles.title, style]}>
      {children}
    </Text>
  );
}

export function CardDescription({ children, style }: { children: React.ReactNode, style?: any }) {
  return (
    <Text style={[styles.description, style]}>
      {children}
    </Text>
  );
}

export function CardContent({ children, style }: CardProps) {
  return (
    <View style={[styles.content, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
    textAlign: 'center',
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
});
