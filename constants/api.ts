import { Platform } from "react-native";
import Constants from "expo-constants";

function getExpoDevelopmentHost() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  try {
    return new URL(`http://${hostUri}`).hostname;
  } catch {
    return null;
  }
}

const expoDevelopmentHost = Platform.OS !== "web" && __DEV__ ? getExpoDevelopmentHost() : null;
const localHost = Platform.OS === "web"
  ? "http://127.0.0.1:8000"
  : expoDevelopmentHost
    ? `http://${expoDevelopmentHost}:8000`
    : Platform.OS === "android"
      ? "http://10.0.2.2:8000"
      : "http://127.0.0.1:8000";
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || `${localHost}/api/v1`).replace(/\/+$/, "");

export type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
  token?: string | null;
};

export type ApiRequest = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface Sport {
  id: number;
  name: string;
  slug: string;
}

export interface CurrencyOption {
  code: string;
  name: string;
  is_default: boolean;
}

export interface Country {
  code: string;
  name: string;
  default_currency: string | null;
  currencies: CurrencyOption[];
}

export interface Venue {
  id: number;
  name: string;
  venue_name: string;
  address: string;
  city: string;
  region: string;
  state: string;
  country: string;
  country_info: Country | null;
  latitude: string | null;
  longitude: string | null;
  sports: Sport[];
  pricing_type: "free" | "fixed" | "hourly" | "quote";
  price_amount: string | null;
  price_currency: string;
}

export interface Tournament {
  id: number;
  title: string;
  description: string;
  host: string;
  sport: Sport;
  venue: Venue;
  venue_name: string;
  state: string;
  latitude: string | null;
  longitude: string | null;
  country: Country | null;
  starts_at: string;
  duration_minutes: number;
  venue_pricing_type_snapshot: Venue["pricing_type"];
  venue_rate_snapshot: string | null;
  venue_rate_currency_snapshot: string;
  venue_fee_estimate: string | null;
  venue_fee: string | null;
  venue_fee_status: "not_required" | "pending" | "agreed" | "paid" | "waived";
  entry_fee: string;
  currency: string;
  max_players: number;
  projected_prize_pool: string;
  slots_taken: number;
  slots_open: number;
  taken_slots: number[];
  status: "open" | "full" | "cancelled" | "completed";
  is_joined: boolean;
  my_slot: number | null;
  my_payment_status: "pending" | "paid" | "refunded" | "not_required" | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentEntry {
  id: number;
  username: string;
  slot_number: number;
  entry_fee_at_join: string;
  payment_status: "pending" | "paid" | "refunded" | "not_required";
  reservation_expires_at: string | null;
  joined_at: string;
}

export interface TournamentBillingStatus {
  payment_status: "pending" | "paid" | "refunded" | "not_required";
  reservation_expires_at: string | null;
  reservation_expired: boolean;
  slot_number: number;
  entry_fee: string;
  currency: string;
  reference: string | null;
  transaction_status: "pending" | "success" | "failed" | "success_unallocated" | null;
  authorization_url: string | null;
}

export interface PaystackCheckout {
  reference: string;
  authorization_url: string;
  payment_status: "pending" | "paid" | "not_required";
  amount: string;
  currency: string;
  reservation_expires_at: string | null;
}

function resolveUrl(path: string) {
  if (!/^https?:\/\//i.test(path)) {
    return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  }

  const nextUrl = new URL(path);
  const basePath = new URL(API_BASE_URL).pathname.replace(/\/$/, "");
  const endpoint = nextUrl.pathname.startsWith(basePath)
    ? nextUrl.pathname.slice(basePath.length)
    : nextUrl.pathname.replace(/^\/api\/v1/, "");
  return `${API_BASE_URL}${endpoint}${nextUrl.search}`;
}

function getErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const payload = data as Record<string, unknown>;
  if (typeof payload.detail === "string") return payload.detail;

  return Object.entries(payload)
    .map(([field, messages]) => {
      const text = Array.isArray(messages) ? messages.join(" ") : String(messages);
      return field === "non_field_errors" ? text : `${field.replaceAll("_", " ")}: ${text}`;
    })
    .join(" ");
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (requestOptions.body) requestHeaders.set("Content-Type", "application/json");
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(resolveUrl(path), { ...requestOptions, headers: requestHeaders });
  } catch {
    throw new ApiError(`Could not reach SportsClan API at ${API_BASE_URL}.`, 0);
  }

  const data = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(getErrorMessage(data, `Request failed (${response.status}).`), response.status, data);
  }
  return data as T;
}

export async function fetchAllPages<T>(path: string, request: ApiRequest) {
  const rows: T[] = [];
  let next: string | null = path;
  let pageCount = 0;

  while (next && pageCount < 20) {
    const page: ApiPage<T> = await request<ApiPage<T>>(next);
    rows.push(...page.results);
    next = page.next;
    pageCount += 1;
  }

  return rows;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatVenueRate(venue: Venue) {
  if (venue.pricing_type === "free") return "Free";
  if (venue.pricing_type === "quote" || !venue.price_amount) return "Contact venue for price";
  const amount = formatPrice(venue.price_amount, venue.price_currency);
  return venue.pricing_type === "hourly" ? `${amount} per hour` : `${amount} per booking`;
}

export function estimateVenueFee(
  pricingType: Venue["pricing_type"],
  rate: string | null,
  durationMinutes: number,
) {
  if (pricingType === "free") return "0.00";
  if (pricingType === "quote" || rate === null) return null;
  const amount = Number(rate) * (pricingType === "hourly" ? durationMinutes / 60 : 1);
  return (Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2);
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes} min`;
  if (!remainingMinutes) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}