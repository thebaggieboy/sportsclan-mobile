import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/AuthContext";
import { AppButton, AppScreen, EmptyState, PageHeader, TextField, TournamentCard, uiStyles } from "@/components/Ui";
import { fetchAllPages, Sport, Tournament } from "@/constants/api";
import { colors, fonts } from "@/constants/theme";

export default function BrowseScreen() {
  const router = useRouter();
  const { request } = useAuth();
  const [sports, setSports] = useState<Sport[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status: "open" });
      if (selectedSport) params.set("sport__slug", selectedSport);
      if (city.trim()) params.set("venue__city", city.trim());
      if (search.trim()) params.set("search", search.trim());
      const [nextSports, nextTournaments] = await Promise.all([
        sports.length ? Promise.resolve(sports) : fetchAllPages<Sport>("/sports/", request),
        fetchAllPages<Tournament>(`/tournaments/?${params.toString()}`, request),
      ]);
      setSports(nextSports);
      setTournaments(nextTournaments);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load tournaments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city, request, search, selectedSport, sports]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <AppScreen>
      <FlatList
        data={tournaments}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[uiStyles.scrollContent, styles.listContent]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.blue} />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.brandRow}>
              <View style={styles.brandWordmark}><View style={styles.brandIcon}><Text style={styles.brandLetter}>S</Text></View><Text style={styles.brandName}>SPORTSCLAN</Text></View>
              <Pressable accessibilityLabel="Open account" onPress={() => router.push("/(tabs)/account")} style={styles.accountButton}><Ionicons name="person-outline" size={19} color={colors.ink} /></Pressable>
            </View>
            <PageHeader eyebrow="PLAY TOGETHER" title="Find your game." />
            <Text style={styles.description}>Choose a sport, find a local game, and claim your spot.</Text>
            <TextField label="Search games" placeholder="Team, tournament, or venue" value={search} onChangeText={setSearch} returnKeyType="search" onSubmitEditing={() => load()} />
            <TextField label="City" placeholder="Filter by city" value={city} onChangeText={setCity} returnKeyType="search" onSubmitEditing={() => load()} />
            <View style={styles.filterBar}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
              <Pressable onPress={() => setSelectedSport(null)} style={[styles.filterChip, selectedSport === null && styles.filterChipActive]}><Text style={[styles.filterText, selectedSport === null && styles.filterTextActive]}>All sports</Text></Pressable>
              {sports.map((sport) => <Pressable key={sport.id} onPress={() => setSelectedSport(selectedSport === sport.slug ? null : sport.slug)} style={[styles.filterChip, selectedSport === sport.slug && styles.filterChipActive]}><Text style={[styles.filterText, selectedSport === sport.slug && styles.filterTextActive]}>{sport.name}</Text></Pressable>)}
            </ScrollView></View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Open tournaments</Text><Text style={styles.resultCount}>{tournaments.length} found</Text></View>
          </View>
        }
        renderItem={({ item }) => <TournamentCard tournament={item} onPress={() => router.push({ pathname: "/tournament/[id]", params: { id: String(item.id) } })} />}
        ListEmptyComponent={loading ? <View style={styles.loading}><ActivityIndicator color={colors.blue} /><Text style={styles.loadingText}>Loading games…</Text></View> : <EmptyState icon="basketball-outline" title="No open games yet" detail="Start a tournament and invite your friends to join." action={<AppButton label="Create a tournament" icon="add" onPress={() => router.push("/create")} />} />}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingTop: 10 },
  headerContent: { gap: 15, paddingBottom: 8 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  brandWordmark: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandIcon: { width: 31, height: 31, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: colors.blue },
  brandLetter: { color: colors.white, fontFamily: fonts.bold, fontSize: 17, lineHeight: 19 },
  brandName: { color: colors.ink, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4 },
  accountButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 19, backgroundColor: colors.white },
  description: { marginTop: -12, color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 18 },
  filterBar: { marginHorizontal: -20 },
  filterList: { gap: 7, paddingHorizontal: 20 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white },
  filterChipActive: { borderColor: colors.blue, backgroundColor: colors.blue },
  filterText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10 },
  filterTextActive: { color: colors.white },
  errorText: { color: colors.red, fontFamily: fonts.medium, fontSize: 10 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
  resultCount: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9 },
  loading: { alignItems: "center", padding: 30, gap: 9 },
  loadingText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10 },
});
