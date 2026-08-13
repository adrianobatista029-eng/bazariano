import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { MAPBOX_ACCESS_TOKEN } from "@env";
import { getOrderById, updateOrderStatus, type Database } from "@marketplace/supabase";
import { supabase } from "@/lib/supabase";
import { requestLocationPermission, startLocationTracking, stopLocationTracking } from "@/lib/location";
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
    let courierId: string | null = null;

    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      courierId = user.id;
      startLocationTracking(courierId);
    })();

    return () => stopLocationTracking();
  }, []);

  async function handleAdvanceStatus() {
    if (!status) return;
    const next = NEXT_STATUS[status];
    if (!next) return;

    const { data, error } = await updateOrderStatus(supabase, orderId, next);
    if (error || !data) return;

    setStatus(data.status);

    if (data.status === "delivered") {
      stopLocationTracking();
      navigation.navigate("AvailableOrders");
    }
  }

  return (
    <View style={styles.container}>
      <MapboxGL.MapView style={styles.map}>
        <MapboxGL.Camera followUserLocation followZoomLevel={14} />
        <MapboxGL.UserLocation visible />
      </MapboxGL.MapView>
      <View style={styles.footer}>
        <Text style={styles.address}>{address}</Text>
        {status && NEXT_STATUS[status] && (
          <Button title={NEXT_STATUS_LABEL[status]!} onPress={handleAdvanceStatus} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  footer: { padding: 16, borderTopWidth: 1, borderColor: "#e2e8f0" },
  address: { marginBottom: 12 },
});
