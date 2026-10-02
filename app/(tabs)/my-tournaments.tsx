import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/AuthContext";
import { AppButton, AppScreen, EmptyState, PageHeader, TournamentCard, uiStyles } from "@/components/Ui";
import { fetchAllPages, Tournament } from "@/constants/api";
import { colors, fonts } from "@/constants/theme";

export default function MyTournamentsScreen() {
  const router = useRouter();
  const { request, user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (!user) {
      setTournaments([]);
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setTournaments(await fetchAllPages<Tournament>("/tournaments/mine/", request));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load your tournaments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [request, user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <AppScreen>
      <FlatList
        data={tournaments}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[uiStyles.scrollContent, styles.content]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.blue} />}
        ListHeaderComponent={<View style={styles.header}><PageHeader eyebrow="YOUR GAMES" title="My tournaments." /><Text style={styles.subtitle}>Games you host or joined.</Text>{error ? <Text style={styles.error}>{error}</Text> : null}</View>}
        renderItem={({ item }) => <TournamentCard tournament={item} onPress={() => router.push({ pathname: "/tournament/[id]", params: { id: String(item.id) } })} />}
        ListEmptyComponent={loading ? <View style={styles.loading}><ActivityIndicator color={colors.blue} /><Text style={styles.loadingText}>Loading your games…</Text></View> : user ? <EmptyState icon="calendar-outline" title="No tournaments yet" detail="Join an open spot or make a tournament for your friends." action={<AppButton label="Browse games" icon="search" onPress={() => router.push("/")} />} /> : <EmptyState icon="person-circle-outline" title="Sign in to see your games" detail="Your hosted and joined tournaments will show up here." action={<AppButton label="Sign in or join" icon="arrow-forward" onPress={() => router.push("/auth")} />} />}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 26 },
  header: { gap: 8, paddingBottom: 7 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11 },
  error: { color: colors.red, fontFamily: fonts.medium, fontSize: 10 },
  loading: { alignItems: "center", padding: 30, gap: 9 },
  loadingText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10 },
});