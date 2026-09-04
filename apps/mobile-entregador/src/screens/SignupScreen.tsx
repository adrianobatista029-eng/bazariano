import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createCourierProfile } from "@marketplace/supabase";
import { supabase } from "@/lib/supabase";
import { promptOverlayPermission } from "@/lib/overlay";
import { promptBatteryOptimizationExemption } from "@/lib/battery";
import { COLORS } from "@/theme";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

const BANNER_HEIGHT = Dimensions.get("window").width / 1.833;

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
        data: { full_name: fullName.trim(), phone: phone.trim() || null },
      },
    });

    if (authError || !data.user) {
      setLoading(false);
      setError(authError?.message ?? "Não foi possível criar a conta.");
      return;
    }

    // O role vira 'courier' só aqui, dentro do banco (register_as_courier) —
    // nunca é algo que o app manda diretamente no cadastro.
    const { error: courierError } = await createCourierProfile(
      supabase,
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

    // Pede a permissão de sobreposição (bolha sobre outros apps) já na
    // entrada do usuário novo, logo após o cadastro — não espera ele
    // descobrir isso sozinho só quando tentar ficar online pela primeira
    // vez (mesmo aviso reaparece em HomeScreen.tsx pra quem já tinha conta).
    Alert.alert("Cadastro enviado", "Sua conta de entregador foi criada com sucesso.", [
      {
        text: "OK",
        onPress: () => {
          promptOverlayPermission();
          promptBatteryOptimizationExemption();
        },
      },
    ]);
    // navegação para a área logada acontece automaticamente via listener de auth state no App.tsx
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Image
          source={require("../assets/auth-bg.jpg")}
          style={styles.banner}
          resizeMode="cover"
        />
        <View style={styles.contentArea}>
          <View style={styles.card}>
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

            <TouchableOpacity onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.accent, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>{loading ? "Aguarde..." : "Criar conta"}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
              <Text style={styles.linkText}>Já tem conta? Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1 },
  banner: { width: "100%", height: BANNER_HEIGHT },
  contentArea: { padding: 16, paddingBottom: 40 },
  // Mesmos valores do .surface-panel do site (radius-xl = 14px, p-8 = 32px).
  card: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  sectionLabel: { color: COLORS.muted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  vehicleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  vehicleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  vehicleOptionSelected: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  vehicleOptionText: { color: COLORS.muted, fontWeight: "600", fontSize: 14 },
  vehicleOptionTextSelected: { color: COLORS.accent },
  error: { color: COLORS.danger, fontSize: 14, marginBottom: 12 },
  button: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
  linkButton: { marginTop: 16, alignItems: "center" },
  linkText: { color: COLORS.accent, fontSize: 14, textDecorationLine: "underline" },
});
