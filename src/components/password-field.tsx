import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type PasswordFieldProps = Omit<TextInputProps, 'secureTextEntry'> & {
  label: string;
};

/** A password input with an eye button to show or hide what was typed. */
export function PasswordField({ label, style, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <AppText variant="caption">{label}</AppText>
      <View style={styles.box}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          style={styles.eye}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
          <SymbolView
            name={
              visible
                ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                : { ios: 'eye', android: 'visibility', web: 'visibility' }
            }
            size={22}
            tintColor={Colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  input: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: Spacing.md,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.text,
  },
  eye: {
    paddingHorizontal: Spacing.md,
  },
});
