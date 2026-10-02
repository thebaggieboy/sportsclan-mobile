import * as SecureStore from "expo-secure-store";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { apiRequest, ApiError, ApiRequest, ApiRequestOptions, TokenPair, User } from "@/constants/api";

const ACCESS_KEY = "sportsclan.access";
const REFRESH_KEY = "sportsclan.refresh";

async function readToken(key: string) {
  if (Platform.OS === "web") {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function saveToken(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeToken(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isInitializing: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  register: (details: RegisterData) => Promise<void>;
  signOut: () => Promise<void>;
  request: ApiRequest;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const accessRef = useRef<string | null>(null);
  const refreshRef = useRef<string | null>(null);
  const refreshPromise = useRef<Promise<string | null> | null>(null);

  const applyTokens = useCallback(async (tokens: TokenPair) => {
    accessRef.current = tokens.access;
    refreshRef.current = tokens.refresh;
    setAccessToken(tokens.access);
    await Promise.all([saveToken(ACCESS_KEY, tokens.access), saveToken(REFRESH_KEY, tokens.refresh)]);
  }, []);

  const refreshAccess = useCallback(async () => {
    if (!refreshRef.current) return null;
    if (!refreshPromise.current) {
      refreshPromise.current = apiRequest<{ access: string }>("/auth/token/refresh/", {
        method: "POST",
        body: JSON.stringify({ refresh: refreshRef.current }),
      })
        .then(async ({ access }) => {
          accessRef.current = access;
          setAccessToken(access);
          await saveToken(ACCESS_KEY, access);
          return access;
        })
        .catch(async () => {
          accessRef.current = null;
          refreshRef.current = null;
          setAccessToken(null);
          setUser(null);
          await Promise.all([removeToken(ACCESS_KEY), removeToken(REFRESH_KEY)]);
          return null;
        })
        .finally(() => {
          refreshPromise.current = null;
        });
    }
    return refreshPromise.current;
  }, []);

  const request = useCallback<ApiRequest>(
    async <T,>(path: string, options: ApiRequestOptions = {}) => {
      const { token: explicitToken, ...requestOptions } = options;
      const token = explicitToken ?? accessRef.current;
      try {
        return await apiRequest<T>(path, { ...requestOptions, token });
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          error.status !== 401 ||
          !refreshRef.current ||
          path.includes("/auth/token/")
        ) {
          throw error;
        }
        const refreshedAccess = await refreshAccess();
        if (!refreshedAccess) throw error;
        return apiRequest<T>(path, { ...requestOptions, token: refreshedAccess });
      }
    },
    [refreshAccess],
  );

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const [storedAccess, storedRefresh] = await Promise.all([
          readToken(ACCESS_KEY),
          readToken(REFRESH_KEY),
        ]);
        accessRef.current = storedAccess;
        refreshRef.current = storedRefresh;
        let token = storedAccess;
        if (!token && storedRefresh) token = await refreshAccess();
        if (token) {
          try {
            const currentUser = await apiRequest<User>("/auth/me/", { token });
            if (!cancelled) {
              setAccessToken(token);
              setUser(currentUser);
            }
          } catch (error) {
            if (error instanceof ApiError && error.status === 401 && storedRefresh) {
              token = await refreshAccess();
              if (token) {
                const currentUser = await apiRequest<User>("/auth/me/", { token });
                if (!cancelled) {
                  setAccessToken(token);
                  setUser(currentUser);
                }
              }
            } else {
              throw error;
            }
          }
        }
      } catch {
        accessRef.current = null;
        refreshRef.current = null;
        await Promise.all([removeToken(ACCESS_KEY), removeToken(REFRESH_KEY)]);
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, [refreshAccess]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const tokens = await apiRequest<TokenPair>("/auth/token/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const currentUser = await apiRequest<User>("/auth/me/", { token: tokens.access });
      await applyTokens(tokens);
      setUser(currentUser);
    },
    [applyTokens],
  );

  const register = useCallback(
    async (details: RegisterData) => {
      const response = await apiRequest<{ user: User } & TokenPair>("/auth/register/", {
        method: "POST",
        body: JSON.stringify(details),
      });
      await applyTokens(response);
      setUser(response.user);
    },
    [applyTokens],
  );

  const signOut = useCallback(async () => {
    accessRef.current = null;
    refreshRef.current = null;
    setAccessToken(null);
    setUser(null);
    await Promise.all([removeToken(ACCESS_KEY), removeToken(REFRESH_KEY)]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isInitializing, signIn, register, signOut, request }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}