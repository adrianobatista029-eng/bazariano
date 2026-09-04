import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
// O mapa fica de propósito atrás da barra de status (visual imersivo, tipo
// Uber/iFood) — só os cards flutuantes (status/ganhos) precisam do respiro.
// O SafeAreaView do "react-native" não reserva esse espaço no Android, então
// usa o inset de verdade só nesse card em vez de no container inteiro.
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import MapboxGL from "@rnmapbox/maps";
import { MAPBOX_ACCESS_TOKEN } from "@env";
import {
  listAvailableOrdersForCourier,
  acceptOrderAsCourier,
  getCourierEarningsToday,
  setCourierStatus,
  type Database,
} from "@marketplace/supabase";
import { supabase } from "@/lib/supabase";
import {
  requestLocationPermission,
  startLocationTracking,
  stopLocationTracking,
  subscribeToDeviceLocation,
} from "@/lib/location";
import { promptOverlayPermission } from "@/lib/overlay";
import { promptBatteryOptimizationExemption } from "@/lib/battery";
import { COLORS, MAPBOX_STYLE_URL } from "@/theme";
import type { HomeTabParamList, RootStackParamList } from "@/navigation/types";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  seller: { full_name: string | null } | null;
};
type Props = CompositeScreenProps<
  BottomTabScreenProps<HomeTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

const OFFER_SECONDS = 60;

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function distanceKm(from: [number, number], toLng: number, toLat: number) {
  const [fromLng, fromLat] = from;
  const R = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Isolado num componente próprio pra ticar a cada segundo sem re-renderizar
// a tela inteira (o mapa do Mapbox estava redesenhando 1x/s por causa disso,
// travando o app em aparelhos mais fracos). O `key={offer.id}` no lugar onde
// é usado já cuida de reiniciar a contagem quando troca de oferta.
function OfferTimer() {
  const [secondsLeft, setSecondsLeft] = useState(OFFER_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? OFFER_SECONDS : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.timerPill}>
      <Text style={styles.timerText}>0:{secondsLeft.toString().padStart(2, "0")}</Text>
    </View>
  );
}

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState("E");
  const [earningsCents, setEarningsCents] = useState(0);
  const [locationReady, setLocationReady] = useState(false);
  const [courierId, setCourierId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [accepting, setAccepting] = useState(false);

  const offer = availableOrders.find((order) => !skippedIds.has(order.id)) ?? null;

  useEffect(() => {
    return subscribeToDeviceLocation((latitude, longitude) => {
      setCoords([longitude, latitude]);
    });
  }, []);

  useEffect(() => {
    requestLocationPermission().then(setLocationReady);

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCourierId(user.id);

      // As três consultas são independentes — rodar em paralelo em vez de
      // uma esperar a outra terminar corta o tempo de carregamento inicial
      // em até 3x (isso pesava bastante na entrada do app).
      const [{ data: profile }, { data: courier }, { total_cents }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
        supabase.from("couriers").select("status").eq("id", user.id).single(),
        getCourierEarningsToday(supabase, user.id),
      ]);

      setInitial((profile?.full_name?.trim().charAt(0) || "E").toUpperCase());
      setAvatarUrl(profile?.avatar_url ?? null);
      setEarningsCents(total_cents);

      const online = courier?.status === "online";
      setIsOnline(online);
      if (online) {
        const granted = await requestLocationPermission();
        if (granted) startLocationTracking(user.id);
      }

      // Pede a permissão de bolha e a isenção de bateria assim que o app
      // abre, não só quando o entregador tenta ficar online — pra quem já
      // tem conta e nunca passou pelo cadastro (onde os dois avisos também
      // aparecem agora).
      promptOverlayPermission();
      promptBatteryOptimizationExemption();
    });
  }, []);

  const loadAvailableOrders = useCallback(async () => {
    const { data } = await listAvailableOrdersForCourier(supabase);
    setAvailableOrders((data as Order[] | null) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAvailableOrders();
    }, [loadAvailableOrders])
  );

  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(loadAvailableOrders, 15000);
    return () => clearInterval(interval);
  }, [isOnline, loadAvailableOrders]);

  async function handleToggleOnline() {
    if (!courierId) return;
    setTogglingOnline(true);

    if (isOnline) {
      stopLocationTracking();
      const { error } = await setCourierStatus(supabase, courierId, "offline");
      setTogglingOnline(false);
      if (error) {
        Alert.alert("Erro", "Não foi possível ficar offline agora.");
        return;
      }
      setIsOnline(false);
      return;
    }

    const granted = await requestLocationPermission();
    if (!granted) {
      setTogglingOnline(false);
      Alert.alert(
        "Permissão necessária",
        "Ative a permissão de localização para ficar online e receber pedidos."
      );
      return;
    }

    const { error } = await setCourierStatus(supabase, courierId, "online");
    setTogglingOnline(false);
    if (error) {
      Alert.alert("Erro", "Não foi possível ficar online agora.");
      return;
    }
    startLocationTracking(courierId);
    setIsOnline(true);
    loadAvailableOrders();
    promptOverlayPermission();
    promptBatteryOptimizationExemption();
  }

  async function handleAccept() {
    if (!offer || !courierId || accepting) return;
    setAccepting(true);
    const { data, error } = await acceptOrderAsCourier(supabase, offer.id, courierId);
    setAccepting(false);
    if (error || !data) {
      Alert.alert("Ops", "Esse pedido acabou de ser aceito por outro entregador.");
      loadAvailableOrders();
      return;
    }
    navigation.navigate("ActiveDelivery", { orderId: data.id });
  }

  function handleDecline() {
    if (!offer) return;
    setSkippedIds((prev) => new Set(prev).add(offer.id));
  }

  function handleRecenter() {
    if (!coords) return;
    // Sem pitch/heading aqui, só o centro/zoom mudam — o ângulo 3D e a
    // rotação que o usuário deu no mapa (pinça/dois dedos) ficam do jeito
    // que estavam. Zera os dois pra voltar pra visão de cima, igual o botão
    // de localização do Google Maps faz.
    cameraRef.current?.setCamera({
      centerCoordinate: coords,
      zoomLevel: 16,
      pitch: 0,
      heading: 0,
      animationDuration: 500,
    });
  }

  const km = offer && offer.delivery_lat && offer.delivery_lng && coords
    ? distanceKm(coords, offer.delivery_lng, offer.delivery_lat)
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mapWrapper}>
        {locationReady ? (
          <MapboxGL.MapView
            style={styles.map}
            styleURL={MAPBOX_STYLE_URL}
            scaleBarPosition={{ top: insets.top + 90, left: 8 }}
          >
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={16}
              centerCoordinate={coords ?? undefined}
              animationMode={coords ? "flyTo" : "moveTo"}
              animationDuration={800}
            />
            {coords && (
              <MapboxGL.PointAnnotation id="courier-position" coordinate={coords}>
                <View style={styles.courierDotOuter}>
                  <View style={styles.courierDotInner} />
                </View>
              </MapboxGL.PointAnnotation>
            )}
          </MapboxGL.MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>Aguardando permissão de localização…</Text>
          </View>
        )}

        <View style={[styles.headerRow, { top: insets.top + 16 }]}>
          <TouchableOpacity
            style={styles.statusPill}
            onPress={handleToggleOnline}
            disabled={togglingOnline || !courierId}
            activeOpacity={0.85}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{initial}</Text>
              </View>
            )}
            <View>
              <Text style={styles.statusLabel}>STATUS</Text>
              {togglingOnline ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <View style={styles.statusValueRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isOnline ? COLORS.success : COLORS.muted },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusValueText,
                      { color: isOnline ? COLORS.success : COLORS.muted },
                    ]}
                  >
                    {isOnline ? "Online" : "Offline"}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>HOJE</Text>
            <Text style={styles.earningsValue}>{formatCurrency(earningsCents)}</Text>
          </View>
        </View>

        {coords && (
          <TouchableOpacity
            style={styles.recenterButton}
            onPress={handleRecenter}
            activeOpacity={0.7}
          >
            <View style={styles.recenterRing}>
              <View style={styles.recenterDot} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {offer ? (
        <View style={styles.offerSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.offerHeaderRow}>
            <Text style={styles.offerTitle}>Nova Rota!</Text>
            <OfferTimer key={offer.id} />
          </View>

          <View style={styles.offerCard}>
            <View style={styles.offerRow}>
              <View style={styles.offerRowLeft}>
                <View style={[styles.offerIcon, { backgroundColor: COLORS.accentSoft }]}>
                  <Text>🏪</Text>
                </View>
                <Text style={styles.offerRowText} numberOfLines={1}>
                  {offer.seller?.full_name ?? "Vendedor"}
                </Text>
              </View>
              {km !== null && (
                <Text style={styles.offerDistance}>{km.toFixed(1)} km</Text>
              )}
            </View>

            <View style={[styles.offerRow, styles.offerRowBorder]}>
              <View style={styles.offerRowLeft}>
                <View style={[styles.offerIcon, { backgroundColor: "rgba(59,130,246,0.12)" }]}>
                  <Text>📍</Text>
                </View>
                <View>
                  <Text style={styles.offerDeliveryLabel}>Entrega em</Text>
                  <Text style={styles.offerRowText} numberOfLines={1}>
                    {offer.delivery_address}
                  </Text>
                </View>
              </View>
              <Text style={styles.offerValue}>{formatCurrency(offer.total_cents)}</Text>
            </View>
          </View>

          <View style={styles.offerActions}>
            <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
              <Text style={styles.declineButtonText}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.acceptButtonText}>Aceitar  ›</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  mapWrapper: { flex: 1 },
  map: { flex: 1 },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.card,
  },
  mapPlaceholderText: { color: COLORS.muted, textAlign: "center" },
  courierDotOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(249,115,22,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  courierDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: "white",
  },
  headerRow: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  // Botão "minha localização", igual o do Google Maps: semi-transparente,
  // canto inferior esquerdo pra não bater com a bolha de navegação.
  recenterButton: {
    position: "absolute",
    left: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  recenterRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  recenterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4285F4",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    paddingRight: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "white", fontWeight: "700" },
  statusLabel: { fontSize: 9, fontWeight: "700", color: "#9CA3AF", letterSpacing: 0.5 },
  statusValueRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusValueText: { fontWeight: "700", fontSize: 13 },
  earningsCard: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    minWidth: 80,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  earningsLabel: { fontSize: 9, fontWeight: "700", color: "#9CA3AF", letterSpacing: 0.5 },
  earningsValue: { fontSize: 14, fontWeight: "800", color: COLORS.success, marginTop: 2 },
  offerSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  sheetHandle: {
    width: 52,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 18,
  },
  offerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  offerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  timerPill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timerText: { color: "#DC2626", fontWeight: "700", fontSize: 12 },
  offerCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  offerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  offerRowBorder: { borderTopWidth: 1, borderTopColor: "#E5E7EB", marginTop: 8, paddingTop: 14 },
  offerRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  offerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  offerRowText: { fontWeight: "700", color: "#374151", fontSize: 13, flexShrink: 1 },
  offerDeliveryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
  },
  offerDistance: {
    fontWeight: "800",
    color: "#374151",
    fontSize: 12,
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  offerValue: { color: COLORS.success, fontWeight: "800", fontSize: 20 },
  offerActions: { flexDirection: "row", gap: 12 },
  declineButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  declineButtonText: { color: "#6B7280", fontWeight: "700" },
  acceptButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: "center",
  },
  acceptButtonText: { color: "white", fontWeight: "800", fontSize: 16 },
});
