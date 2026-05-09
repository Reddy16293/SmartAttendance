import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../../constants/Colors';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  disabled?: boolean;
  isLoading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'default' | 'lg' | 'sm';
}

export function Button({ 
  onPress, 
  children, 
  variant = 'primary', 
  disabled = false, 
  isLoading = false,
  style,
  textStyle,
  size = 'default'
}: ButtonProps) {
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const isDestructive = variant === 'destructive';
  const isSecondary = variant === 'secondary';

  const containerStyles = [
    styles.container,
    variant === 'primary' && styles.primary,
    isOutline && styles.outline,
    isSecondary && styles.secondary,
    isGhost && styles.ghost,
    isDestructive && styles.destructive,
    size === 'lg' && styles.lg,
    size === 'sm' && styles.sm,
    disabled && styles.disabled,
    style
  ];

  const contentTextStyle = [
    styles.text,
    variant === 'primary' && styles.primaryText,
    isOutline && styles.outlineText,
    isSecondary && styles.secondaryText,
    isGhost && styles.ghostText,
    isDestructive && styles.destructiveText,
    size === 'lg' && styles.lgText,
    textStyle
  ];

  const isTextOnlyChild = React.Children.toArray(children).every(
    child => typeof child === 'string' || typeof child === 'number'
  );

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled || isLoading}
      style={containerStyles as any}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator color={isOutline || isGhost ? Colors.light.primary : '#FFF'} />
      ) : (
        isTextOnlyChild ? (
          <Text style={contentTextStyle as any}>{children}</Text>
        ) : (
          children
        )
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primary: {
    backgroundColor: Colors.light.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  secondary: {
    backgroundColor: Colors.light.muted,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: Colors.light.destructive,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFF',
  },
  outlineText: {
    color: Colors.light.text,
  },
  secondaryText: {
    color: Colors.light.text,
  },
  ghostText: {
    color: Colors.light.text,
  },
  destructiveText: {
    color: '#FFF',
  },
  lg: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    height: 56,
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    height: 36,
  },
  lgText: {
    fontSize: 18,
  }
});
