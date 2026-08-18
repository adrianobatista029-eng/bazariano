import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createCourierProfile } from "@marketplace/supabase";
import { supabase } from "@/lib/supabase";
import { COLORS } from "@/theme";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

const VEHICLE_TYPES = [
  { value: "moto", label: "Moto" },
  { value: "carro", label: "Carro" },
  { value: "bike", label: "Bike" },
];

export function SignupScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("moto");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError(null);

    if (!fullName.trim() || !email.trim() || !password || !vehiclePlate.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), role: "courier", phone: phone.trim() || null },
      },
    });

    if (authError || !data.user) {
      setLoading(false);
      setError(authError?.message ?? "Não foi possível criar a conta.");
      return;
    }

    const { error: courierError } = await createCourierProfile(
      supabase,
      data.user.id,
      vehicleType,
      vehiclePlate.trim()
    );

    setLoading(false);

    if (courierError) {
      setError("Conta criada, mas houve um erro ao salvar os dados do veículo.");
      return;
    }

    if (!data.session) {
      Alert.alert(
        "Confirme seu e-mail",
        "Enviamos um link de confirmação para o seu e-mail. Confirme para poder entrar."
      );
      navigation.goBack();
      return;
    }

    Alert.alert(
      "Cadastro enviado",
      "Sua conta foi criada e está em análise. Você já pode explorar o app, mas só vai receber pedidos depois que a aprovação for concluída."
    );
    // navegação para a área logada acontece automaticamente via listener de auth state no App.tsx
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>A</Text>
          </View>
          <Text style={styles.logoText}>
            All<Text style={{ color: COLORS.accent }}>Rota</Text>Hub
          </Text>
        </View>
        <Text style={styles.title}>Criar conta de entregador</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome completo"
          placeholderTextColor={COLORS.muted}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={COLORS.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={COLORS.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Telefone (opcional)"
          placeholderTextColor={COLORS.muted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <Text style={styles.sectionLabel}>Veículo</Text>
        <View style={styles.vehicleRow}>
          {VEHICLE_TYPES.map((v) => (
            <TouchableOpacity
              key={v.value}
              style={[
                styles.vehicleOption,
                vehicleType === v.value && styles.vehicleOptionSelected,
              ]}
              onPress={() => setVehicleType(v.value)}
            >
              <Text
                style={[
                  styles.vehicleOptionText,
                  vehicleType === v.value && styles.vehicleOptionTextSelected,
                ]}
              >
                {v.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Placa do veículo"
          placeholderTextColor={COLORS.muted}
          autoCapitalize="characters"
          value={vehiclePlate}
          onChangeText={setVehiclePlate}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Aguarde..." : "Criar conta"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Já tem conta? Entrar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24, paddingVertical: 40 },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeText: { fontSize: 16, fontWeight: "700", color: "white" },
  logoText: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sectionLabel: { color: COLORS.muted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  vehicleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  vehicleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  vehicleOptionSelected: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  vehicleOptionText: { color: COLORS.muted, fontWeight: "600" },
  vehicleOptionTextSelected: { color: COLORS.accent },
  error: { color: COLORS.danger, marginBottom: 12 },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
  linkButton: { marginTop: 16, alignItems: "center" },
  linkText: { color: COLORS.accent, fontWeight: "600" },
});
