import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { API_URL, USE_COOKIE_AUTH, setAuthToken } from "../api/client";
import { getStoredItem, setStoredItem, removeStoredItem } from "../utils/storage";

import { requestSession } from "../api/authRequest";

const AuthContext = createContext(null);
const SESSION_KEY = "medscan.session";
const LOGOUT_KEY = "medscan.signed-out";

const authRequest = (path, payload) => requestSession(API_URL, path, payload, fetch, undefined, USE_COOKIE_AUTH);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        // Remove tokens persisted by older versions.
        await removeStoredItem(SESSION_KEY);
      } catch (_error) {
        // Storage may be unavailable (for example, in private browsing).
      }
      try {
        if (USE_COOKIE_AUTH) {
          if (await getStoredItem(LOGOUT_KEY)) {
            api.defaults.withCredentials = false;
            return;
          }
          const { data } = await api.get("/auth/me");
          if (mounted && data.user) { setUser(data.user); setToken("cookie"); }
        }
      } catch (_error) {
        // An absent/expired session is expected for a signed-out user.
      } finally {
        if (mounted) {
          setBootstrapping(false);
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function applySession(session) {
    if (USE_COOKIE_AUTH) {
      try {
        api.defaults.withCredentials = true;
        const { data } = await api.get("/auth/me");
        if (!data.user) throw new Error("Sessão inválida");
        await removeStoredItem(LOGOUT_KEY);
        setUser(data.user); setToken("cookie");
      } catch (_error) {
        api.defaults.withCredentials = false;
        throw new Error("Não foi possível confirmar a sessão. Verifique se o navegador permite cookies para este serviço e tente entrar novamente.");
      }
    } else {
      setUser(session.user);
      setToken(session.token);
      setAuthToken(session.token);
    }
  }

  async function login(email, password) {
    setLoading(true);
    try {
      const data = await authRequest("/auth/login", { email, password });
      await applySession(data);
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function register(name, email, age, password, whatsapp = "") {
    setLoading(true);
    try {
      const data = await authRequest("/auth/register", { name, email, age, password, whatsapp });
      await applySession(data);
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function refreshMe() {
    const { data } = await api.get("/auth/me");
    setUser(data.user);
    return data;
  }

  async function logout() {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    api.defaults.withCredentials = false;
    let remoteConfirmed = !USE_COOKIE_AUTH;
    let localRemembered = true;
    try {
      await setStoredItem(LOGOUT_KEY, "1");
      await removeStoredItem(SESSION_KEY);
    } catch (_) { localRemembered = false; }
    if (USE_COOKIE_AUTH) {
      try {
        await api.post("/auth/logout", null, { withCredentials: true, timeout: 5000 });
        remoteConfirmed = true;
      } catch (_) { /* Local access stays blocked even when the server is offline. */ }
    }
    return { remoteConfirmed, localRemembered };
  }

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      bootstrapping,
      login,
      register,
      refreshMe,
      logout
    }),
    [user, token, loading, bootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
