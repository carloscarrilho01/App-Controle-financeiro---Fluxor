import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../types';
import { wp, hp, fs, borderRadius, spacing } from '../utils/responsive';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'decimal-pad' | 'number-pad';
  secureTextEntry?: boolean;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  prefix?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  error,
  multiline = false,
  numberOfLines = 1,
  prefix,
  leftIcon,
  rightIcon,
  style,
  editable = true,
  autoCapitalize,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[
            styles.input,
            multiline && { height: hp(24 * numberOfLines), textAlignVertical: 'top' },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          keyboardType={keyboardType}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          autoCapitalize={autoCapitalize}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)} style={styles.toggleSecure}>
            <MaterialCommunityIcons
              name={isSecure ? 'eye' : 'eye-off'}
              size={22}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: spacing.lg,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputDisabled: {
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    paddingVertical: hp(14),
    fontSize: fs(16),
    color: COLORS.text,
  },
  prefix: {
    fontSize: fs(16),
    color: COLORS.textSecondary,
    marginRight: spacing.sm,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  toggleSecure: {
    padding: wp(4),
  },
  errorText: {
    fontSize: fs(12),
    color: COLORS.danger,
    marginTop: wp(4),
  },
});
