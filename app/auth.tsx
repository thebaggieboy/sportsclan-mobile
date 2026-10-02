import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/AuthContext";
import { AppButton, AppScreen, ErrorBanner, PageHeader, TextField, uiStyles } from "@/components/Ui";
import { colors, fonts } from "@/constants/theme";

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (mode === "signin") await signIn(username.trim(), password);
      else await register({ username: username.trim(), email: email.trim(), password });
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[uiStyles.scrollContent, styles.content]}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Close sign in" style={styles.closeButton}><Text style={styles.closeText}>Close</Text></Pressable>
          <PageHeader eyebrow="SPORTSCLAN" title={mode === "signin" ? "Welcome back." : "Join your crew."} />
          <Text style={styles.subtitle}>{mode === "signin" ? "Sign in to find or manage your games." : "Create an account to start playing."}</Text>
          {mode === "signup" ? <TextField label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /> : null}
          <TextField label="Username" placeholder="Your username" value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username" returnKeyType="next" />
          <TextField label="Password" placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={mode === "signup" ? "new-password" : "password"} onSubmitEditing={submit} />
          {error ? <ErrorBanner message={error} /> : null}
          <AppButton label={mode === "signin" ? "Sign in" : "Create account"} icon="arrow-forward" busy={busy} onPress={submit} />
          <View style={styles.switchRow}><Text style={styles.switchText}>{mode === "signin" ? "New to SportsClan?" : "Already have an account?"}</Text><Pressable onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}><Text style={styles.switchAction}>{mode === "signin" ? "Create account" : "Sign in"}</Text></Pressable></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 20, flexGrow: 1 },
  closeButton: { alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 10 },
  closeText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  subtitle: { marginTop: -10, color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 18 },
  switchRow: { flexDirection: "row", justifyContent: "center", gap: 5, paddingVertical: 8 },
  switchText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10 },
  switchAction: { color: colors.blue, fontFamily: fonts.semibold, fontSize: 10 },
});