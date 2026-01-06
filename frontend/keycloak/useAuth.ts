import type { KeycloakTokenParsed } from "keycloak-js";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import keycloak from "./keycloak";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

type AuthContextValue = {
  status: AuthStatus;
  authenticated: boolean;
  token?: string;
  tokenParsed?: KeycloakTokenParsed;
  login: (redirectUri?: string) => Promise<void>;
  logout: (redirectUri?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [token, setToken] = useState<string | undefined>(undefined);
  const [tokenParsed, setTokenParsed] = useState<KeycloakTokenParsed | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const syncFromKeycloak = () => {
      if (cancelled) return;
      const authenticated = !!keycloak.authenticated;
      setStatus(authenticated ? "authenticated" : "unauthenticated");
      setToken(keycloak.token);
      setTokenParsed(keycloak.tokenParsed);
    };

    keycloak
      .init({ onLoad: "login-required", checkLoginIframe: false })
      .then(() => syncFromKeycloak())
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    keycloak.onAuthSuccess = syncFromKeycloak;
    keycloak.onAuthRefreshSuccess = syncFromKeycloak;
    keycloak.onAuthLogout = syncFromKeycloak;
    keycloak.onTokenExpired = () => {
      void keycloak
        .updateToken(30)
        .then(() => syncFromKeycloak())
        .catch(() => keycloak.login());
    };

    return () => {
      cancelled = true;
      keycloak.onAuthSuccess = undefined;
      keycloak.onAuthRefreshSuccess = undefined;
      keycloak.onAuthLogout = undefined;
      keycloak.onTokenExpired = undefined;
    };
  }, []);

  const login = useCallback((redirectUri?: string) => {
    return keycloak.login(redirectUri ? { redirectUri } : undefined);
  }, []);

  const logout = useCallback((redirectUri?: string) => {
    return keycloak.logout({ redirectUri: redirectUri ?? window.location.origin });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      authenticated: status === "authenticated",
      token,
      tokenParsed,
      login,
      logout,
    }),
    [status, token, tokenParsed, login, logout],
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within <AuthProvider>");
  return value;
}
