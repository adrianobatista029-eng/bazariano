import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
// SafeAreaView do "react-native" não reserva espaço no Android — ver
// HomeScreen.tsx pra mais contexto.
import { SafeAreaView } from "react-native-safe-area-context";
import { setCourierStatus } from "@marketplace/supabase";
import { supabase } from "@/lib/supabase";
import { stopLocationTracking } from "@/lib/location";
import { COLORS } from "@/theme";

export function PerfilScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setName(profile?.full_name ?? "Entregador");
    });
  }, []);

  async function handleLogout() {
    stopLocationTracking();
    if (userId) {
      await setCourierStatus(supabase, userId, "offline");
    }
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase() || "E"}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { alignItems: "center", paddingTop: 48, paddingBottom: 32 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, color: "white", fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  email: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  logoutButton: {
    marginHorizontal: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  logoutText: { color: COLORS.danger, fontWeight: "600" },
});
