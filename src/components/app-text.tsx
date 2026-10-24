import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

type AppTextProps = TextProps & {
  variant?: 'title' | 'heading' | 'body' | 'caption';
};

/** Text in the Inter font with Abide's sizes. Use this instead of `<Text>`. */
export function AppText({ variant = 'body', style, ...rest }: AppTextProps) {
  return <Text style={[styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    color: Colors.text,
  },
  heading: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    lineHeight: 26,
    color: Colors.text,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text,
  },
  caption: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
});
