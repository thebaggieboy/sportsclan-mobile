import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/AuthContext";
import { AppButton, AppScreen, PageHeader, uiStyles } from "@/components/Ui";
import { colors, fonts } from "@/constants/theme";

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut, isInitializing } = useAuth();

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={[uiStyles.scrollContent, styles.content]}>
        <PageHeader eyebrow="SPORTSCLAN" title="Your account." />
        {isInitializing ? <Text style={styles.detail}>Loading your account…</Text> : user ? (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{(user.first_name || user.username).slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.profileCopy}><Text style={styles.username}>{user.first_name || user.username}</Text><Text style={styles.detail}>@{user.username}</Text><Text style={styles.detail}>{user.email}</Text></View>
            </View>
            <View style={styles.note}><Text style={styles.noteTitle}>Entry fees</Text><Text style={styles.noteText}>SportsClan records tournament prices, but it does not collect payments yet. Entries stay marked as pending.</Text></View>
            <AppButton label="Settings" icon="settings-outline" variant="secondary" onPress={() => router.push("/settings")} />
            <AppButton label="Sign out" icon="log-out-outline" variant="secondary" onPress={signOut} />
          </>
        ) : (
          <View style={styles.signInCard}>
            <Text style={styles.signInTitle}>Play with your crew.</Text>
            <Text style={styles.detail}>Sign in to create tournaments, claim a spot, and keep track of your games.</Text>
            <AppButton label="Sign in or create account" icon="arrow-forward" onPress={() => router.push("/auth")} />
            <AppButton label="Settings" icon="settings-outline" variant="secondary" onPress={() => router.push("/settings")} />
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 26 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 15, padding: 17, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white },
  avatar: { width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.blueSoft },
  avatarText: { color: colors.blue, fontFamily: fonts.bold, fontSize: 23 },
  profileCopy: { flex: 1, gap: 4 },
  username: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 15 },
  detail: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 },
  note: { padding: 15, borderRadius: 7, backgroundColor: colors.orangeSoft, gap: 6 },
  noteTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 11 },
  noteText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16 },
  signInCard: { padding: 20, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white, gap: 14 },
  signInTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18 },
});