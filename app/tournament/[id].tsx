import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/AuthContext";
import { AppButton, AppScreen, ErrorBanner, PageHeader, TextField, uiStyles } from "@/components/Ui";
import { ApiError, formatDate, formatDuration, formatPrice, formatVenueRate, Tournament } from "@/constants/api";
import { colors, fonts } from "@/constants/theme";

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { request, user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [venueFeeInput, setVenueFeeInput] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const result = await request<Tournament>(`/tournaments/${id}/`);
      setTournament(result);
      setSelectedSlot(result.my_slot);
      setVenueFeeInput(result.venue_fee ?? result.venue_fee_estimate ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this tournament.");
    } finally {
      setLoading(false);
    }
  }, [id, request]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const join = async () => {
    if (!tournament || !selectedSlot) return;
    if (!user) {
      router.push("/auth");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await request(`/tournaments/${tournament.id}/join/`, {
        method: "POST",
        body: JSON.stringify({ slot_number: selectedSlot }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not claim this spot.");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!tournament) return;
    setBusy(true);
    setError("");
    try {
      await request(`/tournaments/${tournament.id}/leave/`, { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not leave this tournament.");
    } finally {
      setBusy(false);
    }
  };

  const saveVenueFee = async () => {
    if (!tournament) return;
    const fee = Number(venueFeeInput);
    if (!Number.isFinite(fee) || fee < 0) {
      setError("Enter the agreed venue cost, or zero if the venue waived it.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await request(`/tournaments/${tournament.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ venue_fee: fee.toFixed(2), venue_fee_status: fee === 0 ? "waived" : "agreed" }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the agreed venue cost.");
    } finally {
      setBusy(false);
    }
  };

  const removeTournament = () => {
    if (!tournament) return;
    Alert.alert("Delete tournament?", "This removes the tournament and its player spots.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await request(`/tournaments/${tournament.id}/`, { method: "DELETE" });
            router.back();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not delete tournament.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const tournamentHasStarted = tournament ? new Date(tournament.starts_at) <= new Date() : false;
  const isHost = Boolean(tournament && user?.username === tournament.host);
  const slotsTaken = new Set(tournament?.taken_slots ?? []);
  const venueCountry = tournament?.country?.name ?? tournament?.venue.country_info?.name ?? tournament?.venue.country ?? "Country not set";
  const venueRate = tournament ? formatVenueRate({
    ...tournament.venue,
    pricing_type: tournament.venue_pricing_type_snapshot,
    price_amount: tournament.venue_rate_snapshot,
    price_currency: tournament.venue_rate_currency_snapshot,
  }) : "";
  const bookingStatusLabel = tournament ? tournament.venue_fee_status.replaceAll("_", " ") : "";

  return (
    <AppScreen>
      {loading && !tournament ? (
        <View style={styles.loading}><ActivityIndicator color={colors.blue} /><Text style={styles.loadingText}>Loading tournament…</Text></View>
      ) : tournament ? (
        <ScrollView contentContainerStyle={[uiStyles.scrollContent, styles.content]}>
          <PageHeader eyebrow={`${tournament.country?.name.toUpperCase() ?? "GLOBAL"} · ${tournament.sport.name.toUpperCase()}`} title={tournament.title} action={<Pressable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.backButton}><Ionicons name="arrow-back" size={18} color={colors.ink} /></Pressable>} />
          <View style={styles.statusRow}><View style={[styles.statusPill, tournament.status !== "open" && styles.statusOther]}><Text style={[styles.statusText, tournament.status !== "open" && styles.statusTextOther]}>{tournament.status.toUpperCase()}</Text></View><Text style={styles.host}>Hosted by {tournament.host}</Text></View>

          <View style={styles.infoCard}>
            <View style={styles.infoLine}><View style={styles.infoIcon}><Ionicons name="calendar-outline" size={18} color={colors.blue} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>DATE & TIME</Text><Text style={styles.infoValue}>{formatDate(tournament.starts_at)}</Text></View></View>
            <View style={styles.rule} />
            <View style={styles.infoLine}><View style={styles.infoIcon}><Ionicons name="location-outline" size={18} color={colors.blue} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>VENUE</Text><Text style={styles.infoValue}>{tournament.venue.name}</Text><Text style={styles.infoSub}>{[tournament.venue.address, tournament.venue.city, tournament.venue.region, tournament.venue.country].filter(Boolean).join(", ")}</Text></View></View>
            <View style={styles.rule} />
            <View style={styles.infoLine}><View style={styles.infoIcon}><Ionicons name="globe-outline" size={18} color={colors.blue} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>COUNTRY</Text><Text style={styles.infoValue}>{venueCountry}</Text><Text style={styles.infoSub}>{tournament.country?.default_currency ?? tournament.venue.country_info?.default_currency ?? tournament.currency} currency</Text></View></View>
            <View style={styles.rule} />
            <View style={styles.infoLine}><View style={styles.infoIcon}><Ionicons name="pricetag-outline" size={18} color={colors.blue} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>VENUE RATE</Text><Text style={styles.infoValue}>{venueRate}</Text><Text style={styles.infoSub}>Type: {tournament.venue_pricing_type_snapshot} · {formatDuration(tournament.duration_minutes)}</Text></View></View>
            <View style={styles.rule} />
            <View style={styles.infoLine}><View style={styles.infoIcon}><Ionicons name="business-outline" size={18} color={colors.blue} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>ESTIMATED VENUE COST</Text><Text style={styles.infoValue}>{tournament.venue_fee_estimate === null ? "Contact venue for a quote" : formatPrice(tournament.venue_fee_estimate, tournament.venue_rate_currency_snapshot)}</Text><Text style={styles.infoSub}>Paid separately by the host, not from player entry fees.</Text>{tournament.venue_fee !== null ? <Text style={styles.infoSub}>Agreed cost: {formatPrice(tournament.venue_fee, tournament.venue_rate_currency_snapshot)} · {bookingStatusLabel}</Text> : <Text style={styles.infoSub}>Booking status: {bookingStatusLabel}</Text>}</View></View>
            <View style={styles.rule} />
            <View style={styles.infoLine}><View style={styles.infoIcon}><Ionicons name="cash-outline" size={18} color={colors.blue} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>PRICE PER SPOT</Text><Text style={styles.infoValue}>{formatPrice(tournament.entry_fee, tournament.currency)}</Text><Text style={styles.infoSub}>Country currency: {tournament.currency}</Text></View></View>
            <View style={styles.rule} />
            <View style={styles.infoLine}><View style={styles.infoIcon}><Ionicons name="trophy-outline" size={18} color={colors.blue} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>PROJECTED PRIZE POOL</Text><Text style={styles.infoValue}>{formatPrice(tournament.projected_prize_pool, tournament.currency)}</Text><Text style={styles.infoSub}>{formatPrice(tournament.entry_fee, tournament.currency)} × {tournament.max_players} spots if all are paid</Text></View></View>
          </View>

          <View style={styles.prizeNote}><Text style={styles.prizeNoteTitle}>Suggested: winner takes all</Text><Text style={styles.prizeNoteText}>Pay the winning team captain after the result is confirmed. This is a projection; SportsClan does not collect fees or send prizes yet.</Text></View>

          {isHost && tournament.venue_fee_status !== "not_required" && tournament.venue_fee_status !== "waived" ? <View style={styles.bookingCostCard}><Text style={styles.sectionTitle}>Record agreed venue cost</Text><Text style={styles.bookingCostHelp}>Update this after the venue confirms the booking. This records the agreement; it does not charge or mark the venue paid.</Text><TextField label="Agreed venue cost" value={venueFeeInput} onChangeText={setVenueFeeInput} keyboardType="decimal-pad" placeholder="0.00" /><AppButton label="Save agreed cost" icon="checkmark" busy={busy} onPress={saveVenueFee} /></View> : null}

          {tournament.description ? <View style={styles.descriptionCard}><Text style={styles.sectionTitle}>Game details</Text><Text style={styles.description}>{tournament.description}</Text></View> : null}

          <View style={styles.slotSection}>
            <View style={styles.slotHeading}><View><Text style={styles.sectionTitle}>Choose your spot</Text><Text style={styles.slotSub}>{tournament.slots_taken} of {tournament.max_players} players joined</Text></View><Text style={styles.openCount}>{tournament.slots_open} open</Text></View>
            <View style={styles.slotsGrid}>
              {Array.from({ length: tournament.max_players }, (_, index) => index + 1).map((slotNumber) => {
                const taken = slotsTaken.has(slotNumber);
                const mine = tournament.my_slot === slotNumber;
                const selected = selectedSlot === slotNumber;
                const unavailable = taken || tournament.status !== "open" || tournamentHasStarted;
                return (
                  <Pressable
                    key={slotNumber}
                    accessibilityRole="button"
                    accessibilityLabel={`Player spot ${slotNumber}${mine ? ", your spot" : taken ? ", taken" : ", open"}`}
                    accessibilityState={{ disabled: unavailable, selected }}
                    disabled={unavailable}
                    onPress={() => setSelectedSlot(slotNumber)}
                    style={[styles.slot, taken && styles.slotTaken, selected && !taken && styles.slotSelected]}
                  >
                    <Text style={[styles.slotNumber, taken && styles.slotNumberTaken, selected && !taken && styles.slotNumberSelected]}>{slotNumber.toString().padStart(2, "0")}</Text>
                    <Text style={[styles.slotLabel, taken && styles.slotLabelTaken, selected && !taken && styles.slotLabelSelected]}>{mine ? "YOURS" : taken ? "TAKEN" : "OPEN"}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.paymentNote}><Ionicons name="information-circle-outline" size={17} color={colors.orange} /><Text style={styles.paymentText}>Your spot is reserved with payment marked pending. SportsClan does not collect money yet.</Text></View>
          {error ? <ErrorBanner message={error} /> : null}

          {tournament.is_joined ? <AppButton label="Leave tournament" icon="exit-outline" variant="danger" busy={busy} disabled={tournamentHasStarted} onPress={leave} /> : <AppButton label={user ? selectedSlot ? `Claim spot ${selectedSlot}` : "Choose an open spot" : "Sign in to join"} icon="arrow-forward" busy={busy} disabled={user ? !selectedSlot || tournament.status !== "open" || tournamentHasStarted : false} onPress={user ? join : () => router.push("/auth")} />}
          {isHost ? <AppButton label="Delete tournament" icon="trash-outline" variant="secondary" onPress={removeTournament} disabled={busy} /> : null}
        </ScrollView>
      ) : (
        <View style={styles.notFound}><ErrorBanner message={error || "Tournament not found."} /><AppButton label="Back to games" icon="arrow-back" variant="secondary" onPress={() => router.back()} /></View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20 },
  backButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 20, backgroundColor: colors.white },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 4, backgroundColor: colors.greenSoft },
  statusOther: { backgroundColor: colors.orangeSoft },
  statusText: { color: colors.green, fontFamily: fonts.semibold, fontSize: 8, letterSpacing: 0.8 },
  statusTextOther: { color: colors.orange },
  host: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10 },
  infoCard: { paddingHorizontal: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white },
  infoLine: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  infoIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.blueSoft },
  infoCopy: { flex: 1, gap: 4 },
  infoLabel: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 8, letterSpacing: 0.8 },
  infoValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 12 },
  infoSub: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9, lineHeight: 14 },
  prizeNote: { padding: 13, borderRadius: 7, backgroundColor: colors.blueSoft, gap: 5 },
  prizeNoteTitle: { color: colors.blueDark, fontFamily: fonts.semibold, fontSize: 10 },
  prizeNoteText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9, lineHeight: 15 },
  bookingCostCard: { padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white, gap: 10 },
  bookingCostHelp: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9, lineHeight: 15 },
  rule: { height: 1, backgroundColor: colors.line },
  descriptionCard: { padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white, gap: 8 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 },
  description: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 },
  slotSection: { padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white, gap: 15 },
  slotHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  slotSub: { marginTop: 4, color: colors.muted, fontFamily: fonts.regular, fontSize: 9 },
  openCount: { color: colors.blue, fontFamily: fonts.semibold, fontSize: 9 },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { width: "22.5%", minHeight: 61, alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderColor: colors.line, borderRadius: 6, backgroundColor: colors.white },
  slotTaken: { borderColor: colors.line, backgroundColor: "#f0f2f6" },
  slotSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  slotNumber: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
  slotNumberTaken: { color: "#9aa5b6" },
  slotNumberSelected: { color: colors.blue },
  slotLabel: { color: colors.green, fontFamily: fonts.semibold, fontSize: 7, letterSpacing: 0.5 },
  slotLabelTaken: { color: colors.muted },
  slotLabelSelected: { color: colors.blue },
  paymentNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 6, backgroundColor: colors.orangeSoft },
  paymentText: { flex: 1, color: "#795338", fontFamily: fonts.regular, fontSize: 9, lineHeight: 15 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11 },
  notFound: { flex: 1, justifyContent: "center", padding: 20, gap: 12 },
});