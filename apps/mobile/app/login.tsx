import { useState } from "react";
import { router } from "expo-router";
import { Button, ErrorText, Field, Heading, Screen } from "@/components/ui";
import { api, ApiError, AUTH_URL } from "@/api/client";
import { useAuthStore } from "@/store/auth.store";
import type { AuthResponse } from "@/api/auth";

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>(
        "/auth/login",
        { email, password },
        undefined,
        AUTH_URL,
      );
      setAuth(res.user, res.tokens);
      router.replace("/");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to sign in. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Heading>Sign in to Lenda</Heading>

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />

      {error ? <ErrorText>{error}</ErrorText> : null}

      <Button title="Sign in" onPress={onSubmit} loading={loading} />
    </Screen>
  );
}
