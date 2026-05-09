import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';

type CircularLoaderProps = {
  message?: string;
};

export function CircularLoader({ message = 'Loading...' }: CircularLoaderProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.light.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 20,
  },
  message: {
    marginTop: 10,
    color: Colors.light.mutedForeground,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
