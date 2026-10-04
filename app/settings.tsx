import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/AuthContext";
import { AppButton, AppScreen, PageHeader, uiStyles } from "@/components/Ui";
import { colors, fonts } from "@/constants/theme";

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, isInitializing } = useAuth();

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={[uiStyles.scrollContent, styles.content]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to account" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={16} color={colors.blue} />
          <Text style={styles.backText}>Account</Text>
        </Pressable>
        <PageHeader eyebrow="SPORTSCLAN" title="Settings." />

        <SettingsSection title="ACCOUNT">
          {isInitializing ? (
            <Text style={styles.description}>Loading account details…</Text>
          ) : user ? (
            <>
              <SettingsRow label="Name" value={[user.first_name, user.last_name].filter(Boolean).join(" ") || "Not set"} />
              <SettingsRow label="Username" value={`@${user.username}`} />
              <SettingsRow label="Email" value={user.email || "Not set"} />
            </>
          ) : (
            <>
              <Text style={styles.description}>You are not signed in. Sign in to manage your account and tournaments.</Text>
              <AppButton label="Sign in or create account" icon="arrow-forward" onPress={() => router.push("/auth")} />
            </>
          )}
        </SettingsSection>

        <SettingsSection title="PRIVACY & SECURITY">
          <View style={styles.iconRow}>
            <Ionicons name="shield-checkmark-outline" size={19} color={colors.blue} />
            <Text style={styles.description}>On iOS and Android, session tokens use the operating system’s secure storage. Sign out to remove the saved session from this device.</Text>
          </View>
        </SettingsSection>

        <SettingsSection title="TOURNAMENTS & PAYMENTS">
          <View style={styles.iconRow}>
            <Ionicons name="wallet-outline" size={19} color={colors.blue} />
            <Text style={styles.description}>Tournament entry fees are displayed for players, but SportsClan does not collect or process payments. Entries may remain pending.</Text>
          </View>
        </SettingsSection>

        <SettingsSection title="NOTIFICATIONS">
          <SettingsRow label="Tournament alerts" value="Not enabled in this app yet" />
          <Text style={styles.description}>Check My Tournaments for updates to games you host or have joined.</Text>
        </SettingsSection>

        <SettingsSection title="ABOUT">
          <SettingsRow label="App" value="SportsClan Mobile" />
          <SettingsRow label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
        </SettingsSection>

        {user ? <AppButton label="Sign out" icon="log-out-outline" variant="secondary" onPress={signOut} /> : null}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 23 },
  backButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  backText: { color: colors.blue, fontFamily: fonts.medium, fontSize: 10, lineHeight: 17 },
  section: { gap: 8 },
  sectionTitle: { color: colors.blue, fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.1, lineHeight: 16 },
  card: { padding: 15, gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 14 },
  rowLabel: { flexShrink: 0, color: colors.muted, fontFamily: fonts.medium, fontSize: 10, lineHeight: 17 },
  rowValue: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 10, lineHeight: 17, textAlign: "right" },
  iconRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  description: { flex: 1, color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 17 },
});
