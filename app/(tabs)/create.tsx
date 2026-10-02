import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { createElement, useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/components/AuthContext";
import { AppButton, AppScreen, EmptyState, ErrorBanner, PageHeader, TextField, uiStyles } from "@/components/Ui";
import { Country, estimateVenueFee, fetchAllPages, formatDuration, formatPrice, formatVenueRate, Sport, Tournament, Venue } from "@/constants/api";
import { colors, fonts } from "@/constants/theme";

const webInputStyle = {
  boxSizing: "border-box" as const,
  width: "100%",
  height: "48px",
  padding: "0 12px",
  border: `1px solid ${colors.line}`,
  borderRadius: "6px",
  backgroundColor: colors.white,
  color: colors.ink,
  fontFamily: "Poppins, sans-serif",
  fontSize: "12px",
  letterSpacing: "0",
};

export default function CreateTournamentScreen() {
  const router = useRouter();
  const { request, user } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [city, setCity] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [entryFee, setEntryFee] = useState("0");
  const [currency, setCurrency] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [startsAt, setStartsAt] = useState(() => {
    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    date.setHours(18, 0, 0, 0);
    return date;
  });
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [loadingSports, setLoadingSports] = useState(true);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSports = useCallback(async () => {
    setLoadingSports(true);
    try {
      const result = await fetchAllPages<Sport>("/sports/", request);
      setSports(result);
      if (result.length) setSelectedSport((current) => current || result[0]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load sports.");
    } finally {
      setLoadingSports(false);
    }
  }, [request]);

  const loadCountries = useCallback(async () => {
    try {
      setCountries(await fetchAllPages<Country>("/countries/", request));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load countries.");
    }
  }, [request]);

  useFocusEffect(useCallback(() => { loadSports(); loadCountries(); }, [loadCountries, loadSports]));

  const matchingCountries = countrySearch.trim().length >= 2
    ? countries.filter((country) => country.name.toLowerCase().includes(countrySearch.trim().toLowerCase()) || country.code.toLowerCase() === countrySearch.trim().toLowerCase()).slice(0, 8)
    : [];

  const chooseCountry = (country: Country) => {
    setSelectedCountry(country);
    setCurrency(country.default_currency ?? country.currencies[0]?.code ?? "");
    setCountrySearch("");
    setSelectedVenue(null);
    setVenues([]);
  };

  const searchVenues = async () => {
    if (!selectedSport || !selectedCountry) return;
    setLoadingVenues(true);
    setError("");
    setSelectedVenue(null);
    try {
      const params = new URLSearchParams({ "sports__slug": selectedSport.slug });
      params.set("country_reference__code", selectedCountry.code);
      if (city.trim()) params.set("city", city.trim());
      const result = await fetchAllPages<Venue>(`/venues/?${params.toString()}`, request);
      setVenues(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not find venues.");
    } finally {
      setLoadingVenues(false);
    }
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setStartsAt(date);
    if (Platform.OS !== "ios") setPickerMode(null);
  };

  const changePlayers = (delta: number) => {
    setMaxPlayers((count) => Math.max(1, Math.min(99, count + delta)));
  };

  const updateWebDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return;
    setStartsAt((current) => {
      const next = new Date(current);
      next.setFullYear(year, month - 1, day);
      return next;
    });
  };

  const updateWebTime = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return;
    setStartsAt((current) => {
      const next = new Date(current);
      next.setHours(hours, minutes, 0, 0);
      return next;
    });
  };

  const localDateValue = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, "0")}-${String(startsAt.getDate()).padStart(2, "0")}`;
  const localTimeValue = `${String(startsAt.getHours()).padStart(2, "0")}:${String(startsAt.getMinutes()).padStart(2, "0")}`;
  const feeValue = Number(entryFee);
  const projectedPrizePool = (Number.isFinite(feeValue) && feeValue >= 0 ? feeValue * maxPlayers : 0).toFixed(2);

  const createTournament = async () => {
    if (!user) {
      router.push("/auth");
      return;
    }
    if (!selectedCountry || !selectedSport || !selectedVenue || !currency) {
      setError("Choose a country, sport, venue, and currency before creating your tournament.");
      return;
    }
    const fee = Number(entryFee);
    if (!Number.isFinite(fee) || fee < 0) {
      setError("Enter a price of zero or more.");
      return;
    }
    if (startsAt <= new Date()) {
      setError("Choose a future date and time.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const tournament = await request<Tournament>("/tournaments/", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || `${selectedSport.name} tournament`,
          description: description.trim(),
          country_id: selectedCountry.code,
          sport_id: selectedSport.id,
          venue_id: selectedVenue.id,
          starts_at: startsAt.toISOString(),
          duration_minutes: durationMinutes,
          entry_fee: fee.toFixed(2),
          currency,
          max_players: maxPlayers,
        }),
      });
      router.push({ pathname: "/tournament/[id]", params: { id: String(tournament.id) } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create tournament.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[uiStyles.scrollContent, styles.content]}>
          <PageHeader eyebrow="MAKE A PLAN" title="Create a game." />
          {!user ? (
            <EmptyState icon="person-circle-outline" title="Sign in to create a tournament" detail="Your account will be listed as the tournament host." action={<AppButton label="Sign in or join" icon="arrow-forward" onPress={() => router.push("/auth")} />} />
          ) : (
            <>
              <TextField label="Tournament name" placeholder="Sunday Hoops" value={title} onChangeText={setTitle} maxLength={140} />
              <TextField label="Details (optional)" placeholder="What should players bring?" value={description} onChangeText={setDescription} multiline style={styles.descriptionField} />

              <View style={styles.formSection}>
                <Text style={styles.label}>Country</Text>
                {selectedCountry ? <Pressable onPress={() => { setSelectedCountry(null); setSelectedVenue(null); setVenues([]); setCurrency(""); }} style={styles.selectedCountry}><Ionicons name="globe-outline" size={18} color={colors.blue} /><Text style={styles.selectedCountryText}>{selectedCountry.name} ({selectedCountry.code})</Text><Text style={styles.changeCountry}>Change</Text></Pressable> : <TextField label="Search country" placeholder="Type at least 2 letters" value={countrySearch} onChangeText={setCountrySearch} autoCapitalize="words" />}
                {!selectedCountry && countrySearch.trim().length >= 2 ? <View style={styles.countryResults}>{matchingCountries.map((country) => <Pressable key={country.code} onPress={() => chooseCountry(country)} style={styles.countryResult}><Text style={styles.countryResultName}>{country.name}</Text><Text style={styles.countryResultCode}>{country.code}</Text></Pressable>)}{matchingCountries.length === 0 ? <Text style={styles.helpText}>No matching country found.</Text> : null}</View> : null}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Choose a sport</Text>
                {loadingSports ? <ActivityIndicator color={colors.blue} /> : sports.length ? (
                  <View style={styles.optionGrid}>{sports.map((sport) => (
                    <Pressable key={sport.id} onPress={() => { setSelectedSport(sport); setSelectedVenue(null); setVenues([]); }} style={[styles.option, selectedSport?.id === sport.id && styles.optionSelected]}>
                      <Text style={[styles.optionText, selectedSport?.id === sport.id && styles.optionTextSelected]}>{sport.name}</Text>
                    </Pressable>
                  ))}</View>
                ) : <Text style={styles.helpText}>No sports are available yet. Ask an admin to seed the sports list.</Text>}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Choose a local venue</Text>
                <Text style={styles.helpText}>Find a nearby stadium, court, or field that supports your sport.</Text>
                <View style={styles.citySearch}><TextField label="City" placeholder="Enter a city" value={city} onChangeText={setCity} returnKeyType="search" onSubmitEditing={searchVenues} /><AppButton label="Find" icon="search" onPress={searchVenues} disabled={!selectedSport || !selectedCountry} style={styles.findButton} /></View>
                {loadingVenues ? <ActivityIndicator color={colors.blue} /> : null}
                {!loadingVenues && venues.length ? venues.map((venue) => (
                  <Pressable key={venue.id} onPress={() => setSelectedVenue(venue)} style={[styles.venueRow, selectedVenue?.id === venue.id && styles.venueSelected]}>
                    <View style={styles.venueIcon}><Ionicons name="location-outline" size={18} color={colors.blue} /></View>
                    <View style={styles.venueCopy}><Text style={styles.venueName}>{venue.name}</Text><Text style={styles.venueAddress}>{[venue.address, venue.city, venue.region].filter(Boolean).join(", ")}</Text><Text style={styles.venueRate}>{formatVenueRate(venue)}</Text></View>
                    {selectedVenue?.id === venue.id ? <Ionicons name="checkmark-circle" size={21} color={colors.blue} /> : null}
                  </Pressable>
                )) : null}
                {!loadingVenues && !venues.length ? <Text style={styles.helpText}>{selectedCountry ? "Search to see venues in this country. Venues need to be added by an admin." : "Choose a country to find local venues."}</Text> : null}
                {selectedVenue ? (() => {
                  const estimate = estimateVenueFee(selectedVenue.pricing_type, selectedVenue.price_amount, durationMinutes);
                  return <View style={styles.venueEstimate}><Text style={styles.estimateLabel}>Estimated venue cost</Text><Text style={styles.estimateAmount}>{estimate === null ? "Ask venue for a quote" : formatPrice(estimate, selectedVenue.price_currency)}</Text><Text style={styles.estimateNote}>Paid separately by the host. It is not taken from player entry fees.</Text></View>;
                })() : null}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Date and time</Text>
                {Platform.OS === "web" ? (
                  <View style={styles.webDateFields}>
                    <View style={styles.webDateField}><Text style={styles.webDateLabel}>Date</Text>{createElement("input", { type: "date", value: localDateValue, "aria-label": "Date", onChange: (event) => updateWebDate((event.currentTarget as HTMLInputElement).value), style: webInputStyle })}</View>
                    <View style={styles.webDateField}><Text style={styles.webDateLabel}>Time</Text>{createElement("input", { type: "time", value: localTimeValue, "aria-label": "Time", onChange: (event) => updateWebTime((event.currentTarget as HTMLInputElement).value), style: webInputStyle })}</View>
                  </View>
                ) : (
                  <>
                    <View style={styles.dateButtons}>
                      <Pressable onPress={() => setPickerMode("date")} style={styles.dateButton}><Ionicons name="calendar-outline" size={17} color={colors.blue} /><Text style={styles.dateButtonText}>{startsAt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</Text></Pressable>
                      <Pressable onPress={() => setPickerMode("time")} style={styles.dateButton}><Ionicons name="time-outline" size={17} color={colors.blue} /><Text style={styles.dateButtonText}>{startsAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Text></Pressable>
                    </View>
                    {pickerMode ? <View style={styles.pickerWrap}><DateTimePicker value={startsAt} mode={pickerMode} minimumDate={new Date()} display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onDateChange} /><AppButton label="Done" variant="quiet" onPress={() => setPickerMode(null)} /></View> : null}
                  </>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Game length</Text>
                <Text style={styles.helpText}>Used to estimate hourly venue prices.</Text>
                <View style={styles.stepper}><Pressable accessibilityLabel="Reduce game length" onPress={() => setDurationMinutes((minutes) => Math.max(30, minutes - 30))} style={styles.stepperButton}><Ionicons name="remove" size={20} color={colors.blue} /></Pressable><Text style={styles.playerCount}>{formatDuration(durationMinutes)}</Text><Pressable accessibilityLabel="Increase game length" onPress={() => setDurationMinutes((minutes) => Math.min(720, minutes + 30))} style={styles.stepperButton}><Ionicons name="add" size={20} color={colors.blue} /></Pressable></View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Price per spot</Text>
                <View style={styles.priceRow}><TextField label="Entry fee per spot" value={entryFee} onChangeText={setEntryFee} keyboardType="decimal-pad" placeholder="0.00" style={styles.priceInput} editable={Boolean(selectedCountry)} /><View style={styles.currencyGroup}>{selectedCountry?.currencies.map((option) => <Pressable key={option.code} accessibilityLabel={`${option.code}${option.is_default ? ", default currency" : ""}`} onPress={() => setCurrency(option.code)} style={[styles.currencyOption, currency === option.code && styles.currencySelected]}><Text style={[styles.currencyText, currency === option.code && styles.currencyTextSelected]}>{option.code}</Text></Pressable>)}</View></View>
                {selectedCountry ? <Text style={styles.helpText}>Currencies for {selectedCountry.name}. The default is {selectedCountry.default_currency ?? "not set"}.</Text> : <Text style={styles.helpText}>Choose a country first to see valid currencies.</Text>}
                <Text style={styles.helpText}>The API records the fee. It does not collect payment yet.</Text>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Player spots</Text>
                <Text style={styles.helpText}>Set the total number of players who can join.</Text>
                <View style={styles.stepper}><Pressable accessibilityLabel="Remove one spot" onPress={() => changePlayers(-1)} style={styles.stepperButton}><Ionicons name="remove" size={20} color={colors.blue} /></Pressable><Text style={styles.playerCount}>{maxPlayers}</Text><Pressable accessibilityLabel="Add one spot" onPress={() => changePlayers(1)} style={styles.stepperButton}><Ionicons name="add" size={20} color={colors.blue} /></Pressable><Text style={styles.spotSuffix}>players</Text></View>
              </View>

              <View style={styles.prizeCard}>
                <View style={styles.prizeTop}><View style={styles.prizeIcon}><Ionicons name="trophy-outline" size={20} color={colors.blue} /></View><View style={styles.prizeValue}><Text style={styles.prizeLabel}>PROJECTED PRIZE POOL</Text><Text style={styles.prizeAmount}>{formatPrice(projectedPrizePool, currency)}</Text></View></View>
                <Text style={styles.prizeMath}>{formatPrice(Number.isFinite(feeValue) && feeValue >= 0 ? feeValue.toFixed(2) : "0.00", currency)} × {maxPlayers} spots, if every spot is paid.</Text>
                <View style={styles.prizeDivider} />
                <Text style={styles.payoutTitle}>Suggested payout</Text>
                <Text style={styles.payoutText}>Winner takes all. Send the final pool to the winning team captain after the result is confirmed.</Text>
                <Text style={styles.prizeDisclaimer}>Estimate only. SportsClan does not collect entry fees or send prizes yet.</Text>
              </View>

              {error ? <ErrorBanner message={error} /> : null}
              <AppButton label="Create tournament" icon="arrow-forward" busy={saving} onPress={createTournament} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 25 },
  descriptionField: { minHeight: 84, textAlignVertical: "top" },
  formSection: { gap: 10 },
  label: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 12 },
  helpText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16 },
  selectedCountry: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.blue, borderRadius: 6, backgroundColor: colors.blueSoft },
  selectedCountryText: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 11 },
  changeCountry: { color: colors.blue, fontFamily: fonts.semibold, fontSize: 10 },
  countryResults: { borderWidth: 1, borderColor: colors.line, borderRadius: 7, backgroundColor: colors.white, overflow: "hidden" },
  countryResult: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  countryResultName: { color: colors.ink, fontFamily: fonts.medium, fontSize: 10 },
  countryResultCode: { color: colors.muted, fontFamily: fonts.medium, fontSize: 9 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 39, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 6, backgroundColor: colors.white },
  optionSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  optionText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10 },
  optionTextSelected: { color: colors.blueDark },
  citySearch: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  findButton: { minWidth: 83, marginBottom: 0 },
  venueRow: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 7, backgroundColor: colors.white },
  venueSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  venueIcon: { width: 35, height: 35, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: colors.blueSoft },
  venueCopy: { flex: 1, gap: 4 },
  venueName: { color: colors.ink, fontFamily: fonts.medium, fontSize: 11 },
  venueAddress: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9 },
  venueRate: { color: colors.blue, fontFamily: fonts.medium, fontSize: 9 },
  venueEstimate: { padding: 13, borderRadius: 7, backgroundColor: colors.blueSoft, gap: 5 },
  estimateLabel: { color: colors.blueDark, fontFamily: fonts.semibold, fontSize: 9 },
  estimateAmount: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
  estimateNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9, lineHeight: 14 },
  dateButtons: { flexDirection: "row", gap: 9 },
  webDateFields: { flexDirection: "row", gap: 9 },
  webDateField: { flex: 1, gap: 7 },
  webDateLabel: { color: colors.ink, fontFamily: fonts.medium, fontSize: 11 },
  dateButton: { minHeight: 47, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 6, backgroundColor: colors.white },
  dateButtonText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 9 },
  pickerWrap: { padding: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  priceInput: { minWidth: 100, flex: 1 },
  currencyGroup: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 6, backgroundColor: "#edf1f7" },
  currencyOption: { paddingHorizontal: 8, paddingVertical: 10, borderRadius: 4 },
  currencySelected: { backgroundColor: colors.white },
  currencyText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 8 },
  currencyTextSelected: { color: colors.blue, fontFamily: fonts.semibold },
  stepper: { minHeight: 52, flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 15, padding: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 7, backgroundColor: colors.white },
  stepperButton: { width: 37, height: 37, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: colors.blueSoft },
  playerCount: { minWidth: 30, color: colors.ink, fontFamily: fonts.bold, fontSize: 19, textAlign: "center" },
  spotSuffix: { marginRight: 8, color: colors.muted, fontFamily: fonts.regular, fontSize: 10 },
  prizeCard: { padding: 15, borderWidth: 1, borderColor: "#d8e5fb", borderRadius: 8, backgroundColor: colors.white, gap: 9 },
  prizeTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  prizeIcon: { width: 39, height: 39, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.blueSoft },
  prizeValue: { flex: 1, gap: 4 },
  prizeLabel: { color: colors.blue, fontFamily: fonts.semibold, fontSize: 8, letterSpacing: 0.8 },
  prizeAmount: { color: colors.ink, fontFamily: fonts.bold, fontSize: 19 },
  prizeMath: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9 },
  prizeDivider: { height: 1, marginVertical: 2, backgroundColor: colors.line },
  payoutTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 10 },
  payoutText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16 },
  prizeDisclaimer: { color: colors.orange, fontFamily: fonts.medium, fontSize: 9, lineHeight: 14 },
});