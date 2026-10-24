import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Colors, Spacing } from '@/constants/theme';
import { signIn } from '@/lib/auth';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    const message = await signIn(email, password);
    setLoading(false);
    // On success there's nothing to do here: the root layout sees the new
    // session and switches to the tabs.
    setError(message);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Welcome back</AppText>
        <AppText variant="caption">Sign in to check in on today’s reading.</AppText>
      </View>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={handleSignIn}
      />

      {error && <AppText style={styles.error}>{error}</AppText>}

      <Button title="Sign in" onPress={handleSignIn} loading={loading} />

      <Link href="/sign-up" style={styles.link}>
        <AppText style={styles.linkText}>New here? Create an account</AppText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.xs,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  error: {
    color: Colors.primary,
  },
  link: {
    alignSelf: 'center',
    padding: Spacing.sm,
  },
  linkText: {
    color: Colors.primary,
  },
});
