import React, { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) setError(authError.message);
    // navegação acontece automaticamente via listener de auth state no App.tsx
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entregador</Text>
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title={loading ? "Aguarde..." : "Entrar"} onPress={handleLogin} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 24, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  error: { color: "#dc2626", marginBottom: 12 },
});
