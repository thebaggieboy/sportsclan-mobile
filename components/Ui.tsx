import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatDate, formatPrice, Tournament } from "@/constants/api";
import { colors, fonts } from "@/constants/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function AppScreen({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.safeArea} edges={["top"]}>{children}</SafeAreaView>;
}

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  icon?: IconName;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({ label, icon, variant = "primary", busy, disabled, style, ...props }: ButtonProps) {
  const inverse = variant === "primary" || variant === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "quiet" && styles.buttonQuiet,
        variant === "danger" && styles.buttonDanger,
        (disabled || busy) && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
      {...props}
    >
      {busy ? <ActivityIndicator color={inverse ? colors.white : colors.blue} /> : null}
      {!busy && icon ? <Ionicons name={icon} size={18} color={inverse ? colors.white : colors.blue} /> : null}
      <Text style={[styles.buttonText, !inverse && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
}

export function TextField({ label, hint, style, ...props }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor="#9aa6b9" style={[styles.field, style]} accessibilityLabel={label} {...props} />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle-outline" size={18} color={colors.red} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, detail, action }: { icon: IconName; title: string; detail: string; action?: React.ReactNode }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={25} color={colors.blue} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
      {action}
    </View>
  );
}

export function TournamentCard({ tournament, onPress }: { tournament: Tournament; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tournamentCard, pressed && styles.cardPressed]}>
      <View style={styles.cardTopline}>
        <View style={styles.sportTag}><Text style={styles.sportTagText}>{tournament.sport.name.toUpperCase()}</Text></View>
        <Text style={styles.fee}>{formatPrice(tournament.entry_fee, tournament.currency)}<Text style={styles.feeUnit}> / player</Text></Text>
      </View>
      <Text style={styles.tournamentTitle}>{tournament.title}</Text>
      <View style={styles.cardMeta}><Ionicons name="calendar-outline" size={15} color={colors.muted} /><Text style={styles.cardMetaText}>{formatDate(tournament.starts_at)}</Text></View>
      <View style={styles.cardMeta}><Ionicons name="location-outline" size={15} color={colors.muted} /><Text style={styles.cardMetaText} numberOfLines={1}>{tournament.venue_name || tournament.venue.name}, {[tournament.venue.city, tournament.state || tournament.venue.state || tournament.venue.region].filter(Boolean).join(", ")}</Text></View>
      <View style={styles.cardFooter}>
        <Text style={styles.hostText}>Hosted by {tournament.host}</Text>
        <View style={styles.spotCount}><Ionicons name="people-outline" size={14} color={colors.blue} /><Text style={styles.spotCountText}>{tournament.slots_open} spots open</Text></View>
      </View>
    </Pressable>
  );
}

export const uiStyles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30, gap: 18 },
  card: { padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, gap: 10 },
  title: { color: colors.ink, fontFamily: fonts.bold, fontSize: 18, letterSpacing: 0, lineHeight: 1.2 },
  body: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0, lineHeight: 1.6 },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  pageHeader: { minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerCopy: { flex: 1, gap: 5, paddingVertical: 3 },
  eyebrow: { color: colors.blue, fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.3, lineHeight: 15 },
  pageTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 24, letterSpacing: 0, lineHeight: 34 },
  button: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 17, borderRadius: 7, backgroundColor: colors.blue },
  buttonSecondary: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  buttonQuiet: { backgroundColor: colors.blueSoft },
  buttonDanger: { backgroundColor: colors.red },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  buttonText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0 },
  buttonTextSecondary: { color: colors.blue },
  fieldWrap: { gap: 7 },
  fieldLabel: { color: colors.ink, fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0 },
  field: { minHeight: 48, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 6, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0 },
  fieldHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, letterSpacing: 0, lineHeight: 1.5 },
  errorBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 6, backgroundColor: colors.redSoft },
  errorText: { flex: 1, color: colors.red, fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0, lineHeight: 1.4 },
  emptyState: { alignItems: "center", padding: 25, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white, gap: 9 },
  emptyIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.blueSoft },
  emptyTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, letterSpacing: 0, textAlign: "center" },
  emptyDetail: { maxWidth: 270, color: colors.muted, fontFamily: fonts.regular, fontSize: 11, letterSpacing: 0, lineHeight: 1.6, textAlign: "center" },
  tournamentCard: { padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white, gap: 10 },
  cardPressed: { borderColor: colors.blue, opacity: 0.94 },
  cardTopline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sportTag: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 4, backgroundColor: colors.blueSoft },
  sportTagText: { color: colors.blueDark, fontFamily: fonts.semibold, fontSize: 8, letterSpacing: 1 },
  fee: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0 },
  feeUnit: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9 },
  tournamentTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16, letterSpacing: 0, lineHeight: 1.25 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardMetaText: { flex: 1, color: colors.muted, fontFamily: fonts.regular, fontSize: 10, letterSpacing: 0 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 3, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.line },
  hostText: { flex: 1, color: colors.muted, fontFamily: fonts.regular, fontSize: 9, letterSpacing: 0 },
  spotCount: { flexDirection: "row", alignItems: "center", gap: 5 },
  spotCountText: { color: colors.blue, fontFamily: fonts.medium, fontSize: 9, letterSpacing: 0 },
});