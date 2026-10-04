import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/components/AuthContext";
import { AppButton, AppScreen, ErrorBanner, PageHeader, uiStyles } from "@/components/Ui";
import { ApiError, formatDate, formatPrice, PaystackCheckout, Tournament, TournamentBillingStatus } from "@/constants/api";
import { colors, fonts } from "@/constants/theme";

export default function TournamentBillingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { request } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [billing, setBilling] = useState<TournamentBillingStatus | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [game, status] = await Promise.all([
        request<Tournament>(`/tournaments/${id}/`),
        request<TournamentBillingStatus>(`/tournaments/${id}/payment-status/`),
      ]);
      setTournament(game);
      setBilling(status);
      setReference(status.reference ?? "");
      setCheckoutUrl(status.authorization_url ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this reservation.");
    } finally {
      setLoading(false);
    }
  }, [id, request]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const initializePayment = async () => {
    if (!id) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const checkout = await request<PaystackCheckout>(`/tournaments/${id}/payment-initialize/`, {
        method: "POST",
        body: "{}",
      });
      setReference(checkout.reference ?? "");
      setCheckoutUrl(checkout.authorization_url ?? "");
      if (checkout.payment_status === "paid" || checkout.payment_status === "not_required") {
        await load();
        setMessage("This entry is already settled.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start Paystack checkout.");
    } finally {
      setBusy(false);
    }
  };

  const openCheckout = async () => {
    if (!checkoutUrl) return;
    try {
      await WebBrowser.openBrowserAsync(checkoutUrl, { showTitle: true });
      setMessage("Return here after checkout, then verify the payment to secure your spot.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open Paystack checkout.");
    }
  };

  const verifyPayment = async () => {
    if (!id || !reference) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(`/tournaments/${id}/payment-verify/`, {
        method: "POST",
        body: JSON.stringify({ reference }),
      });
      await load();
      setMessage("Payment verified. Your spot is secured.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : "Payment is not confirmed yet.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const releaseReservation = async () => {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await request(`/tournaments/${id}/leave/`, { method: "DELETE" });
      router.replace({ pathname: "/tournament/[id]", params: { id } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not release the reservation.");
    } finally {
      setBusy(false);
    }
  };

  const paid = billing?.payment_status === "paid";
  const noCharge = billing?.payment_status === "not_required";
  const expired = billing?.reservation_expired ?? false;

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={[uiStyles.scrollContent, styles.content]}>
        <Text onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={14} color={colors.blue} />  Tournament</Text>
        <PageHeader eyebrow="PLAYER CHECKOUT" title="Secure your spot." />

        {loading ? <ActivityIndicator color={colors.blue} /> : tournament && billing ? (
          <>
            <View style={styles.summary}>
              <View style={styles.summaryIcon}><Ionicons name="ticket-outline" size={21} color={colors.blue} /></View>
              <View style={styles.summaryCopy}>
                <Text style={styles.gameTitle}>{tournament.title}</Text>
                <Text style={styles.summaryText}>{tournament.sport.name} · spot {billing.slot_number}</Text>
                <Text style={styles.summaryText}>{formatDate(tournament.starts_at)}</Text>
              </View>
              <Text style={styles.amount}>{formatPrice(billing.entry_fee, billing.currency)}</Text>
            </View>

            {paid ? (
              <View style={styles.statusBox}>
                <Ionicons name="checkmark-circle" size={22} color={colors.green} />
                <Text style={styles.statusText}>Payment verified. Your spot is secured.</Text>
              </View>
            ) : noCharge ? (
              <View style={styles.statusBox}>
                <Ionicons name="checkmark-circle" size={22} color={colors.green} />
                <Text style={styles.statusText}>No payment is due. Your spot is secured.</Text>
              </View>
            ) : expired ? (
              <View style={styles.expiredBox}>
                <Text style={styles.expiredTitle}>Reservation expired</Text>
                <Text style={styles.body}>This unpaid hold has ended. Release it, then choose a currently available spot again.</Text>
              </View>
            ) : (
              <>
                <View style={styles.infoBox}>
                  <Ionicons name="time-outline" size={18} color={colors.orange} />
                  <Text style={styles.body}>
                    Your selected spot is held for 15 minutes{billing.reservation_expires_at ? `, until ${new Date(billing.reservation_expires_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}. Paystack confirms payment before the spot is marked secured.
                  </Text>
                </View>
                {checkoutUrl ? (
                  <>
                    <AppButton label="Open Paystack checkout" icon="card-outline" busy={busy} onPress={openCheckout} />
                    <AppButton label="Verify payment" icon="checkmark" variant="secondary" busy={busy} onPress={verifyPayment} />
                  </>
                ) : (
                  <AppButton label="Continue to Paystack" icon="arrow-forward" busy={busy} onPress={initializePayment} />
                )}
              </>
            )}

            {message ? <Text style={styles.successMessage}>{message}</Text> : null}
            {error ? <ErrorBanner message={error} /> : null}
            {!paid && !noCharge ? <AppButton label="Release reservation" icon="close" variant="quiet" busy={busy} onPress={releaseReservation} /> : null}
          </>
        ) : error ? <ErrorBanner message={error} /> : <Text style={styles.body}>Reservation details are unavailable.</Text>}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20 },
  back: { alignSelf: "flex-start", color: colors.blue, fontFamily: fonts.medium, fontSize: 10, lineHeight: 20 },
  summary: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white },
  summaryIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: colors.blueSoft },
  summaryCopy: { flex: 1, gap: 3 },
  gameTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 19 },
  summaryText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9, lineHeight: 15 },
  amount: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 13, borderRadius: 7, backgroundColor: colors.orangeSoft },
  body: { flex: 1, color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 17 },
  statusBox: { flexDirection: "row", alignItems: "center", gap: 9, padding: 14, borderRadius: 7, backgroundColor: colors.greenSoft },
  statusText: { flex: 1, color: colors.green, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 18 },
  expiredBox: { padding: 14, borderRadius: 7, backgroundColor: colors.redSoft, gap: 6 },
  expiredTitle: { color: colors.red, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 18 },
  successMessage: { color: colors.green, fontFamily: fonts.medium, fontSize: 10, lineHeight: 17 },
});
