import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactElement<{ color?: string; size?: number }>;
  variant?: 'primary' | 'success' | 'warning' | 'default';
}

export function StatCard({ title, value, subtitle, icon, variant = 'default' }: StatCardProps) {
  const getVariantColor = () => {
    switch (variant) {
      case 'primary': return Colors.light.primary;
      case 'success': return Colors.light.success;
      case 'warning': return Colors.light.warning;
      default: return Colors.light.mutedForeground;
    }
  };

  const getVariantBg = () => {
    switch (variant) {
      case 'primary': return Colors.light.primary + '1A';
      case 'success': return Colors.light.success + '1A';
      case 'warning': return Colors.light.warning + '1A';
      default: return Colors.light.muted;
    }
  };

  const iconColor = getVariantColor();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getVariantBg() }]}>
          {React.isValidElement(icon) ? 
            React.cloneElement(icon as React.ReactElement<any>, { 
              color: iconColor, 
              size: 20 
            }) : null
          }
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.value}>{value}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    flex: 1,
    minWidth: 150,
    margin: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.mutedForeground,
    flex: 1,
  },
  body: {
    marginTop: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
});
