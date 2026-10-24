import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Colors, Spacing } from '@/constants/theme';
import { signUp } from '@/lib/auth';

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!fullName.trim() || !email.trim() || !password || !inviteCode.trim()) {
      setError('Please fill in every field.');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await signUp({ fullName, email, password, inviteCode });
    setLoading(false);
    setError(result.error);
    setCheckEmail(result.needsEmailConfirmation);
  }

  if (checkEmail) {
    return (
      <Screen>
        <View style={styles.header}>
          <AppText variant="title">Check your email</AppText>
          <AppText>We sent a link to {email.trim()}. Open it to finish creating your account.</AppText>
        </View>
        <Link href="/sign-in" style={styles.link}>
          <AppText style={styles.linkText}>Back to sign in</AppText>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Join Abide</AppText>
        <AppText variant="caption">Your overseer will give you an invite code.</AppText>
      </View>

      <TextField
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />
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
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="At least 6 characters"
      />
      <TextField
        label="Invite code"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        autoCorrect={false}
        onSubmitEditing={handleSignUp}
      />

      {error && <AppText style={styles.error}>{error}</AppText>}

      <Button title="Create account" onPress={handleSignUp} loading={loading} />

      <Link href="/sign-in" style={styles.link}>
        <AppText style={styles.linkText}>Already have an account? Sign in</AppText>
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
