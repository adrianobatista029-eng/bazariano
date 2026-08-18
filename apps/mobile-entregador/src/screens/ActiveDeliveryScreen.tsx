import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { MAPBOX_ACCESS_TOKEN } from "@env";
import { getOrderById, updateOrderStatus, type Database } from "@marketplace/supabase";
import { supabase } from "@/lib/supabase";
import { requestLocationPermission, startLocationTracking } from "@/lib/location";
import { COLORS, MAPBOX_STYLE_URL } from "@/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

type OrderStatus = Database["public"]["Tables"]["orders"]["Row"]["status"];
type Props = NativeStackScreenProps<RootStackParamList, "ActiveDelivery">;

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  accepted: "picked_up",
  picked_up: "delivering",
  delivering: "delivered",
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  accepted: "Marcar como coletado",
  picked_up: "Iniciar entrega",
  delivering: "Marcar como entregue",
};

export function ActiveDeliveryScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [address, setAddress] = useState("");

  useEffect(() => {
    getOrderById(supabase, orderId).then(({ data }) => {
      if (data) {
        setStatus(data.status);
        setAddress(data.delivery_address);
      }
    });
  }, [orderId]);

  useEffect(() => {
    // O rastreamento contínuo já roda desde que o entregador ficou "online"
    // na Home. Isso aqui é só uma rede de segurança (idempotente) caso o
    // app tenha reiniciado com uma entrega já em andamento.
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      startLocationTracking(user.id);
    })();
  }, []);

  async function handleAdvanceStatus() {
    if (!status) return;
    const next = NEXT_STATUS[status];
    if (!next) return;

    const { data, error } = await updateOrderStatus(supabase, orderId, next);
    if (error || !data) return;

    setStatus(data.status);

    if (data.status === "delivered") {
      navigation.navigate("Main", { screen: "Pedidos" });
    }
  }

  return (
    <View style={styles.container}>
      <MapboxGL.MapView style={styles.map} styleURL={MAPBOX_STYLE_URL}>
        <MapboxGL.Camera followUserLocation followZoomLevel={14} />
        <MapboxGL.UserLocation visible />
      </MapboxGL.MapView>
      <View style={styles.footer}>
        <Text style={styles.address}>{address}</Text>
        {status && NEXT_STATUS[status] && (
          <TouchableOpacity style={styles.button} onPress={handleAdvanceStatus}>
            <Text style={styles.buttonText}>{NEXT_STATUS_LABEL[status]!}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { flex: 1 },
  footer: {
    padding: 20,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  address: { marginBottom: 14, color: COLORS.text },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
