import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from "react-native";
import {
  listAvailableOrdersForCourier,
  acceptOrderAsCourier,
  type Database,
} from "@marketplace/supabase";
import { supabase } from "@/lib/supabase";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Props = NativeStackScreenProps<RootStackParamList, "AvailableOrders">;

export function AvailableOrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    setRefreshing(true);
    const { data } = await listAvailableOrdersForCourier(supabase);
    setOrders(data ?? []);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleAccept(order: Order) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await acceptOrderAsCourier(supabase, order.id, user.id);
    if (error || !data) return;

    navigation.navigate("ActiveDelivery", { orderId: data.id });
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadOrders} />}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>Nenhum pedido disponível no momento.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.address}>{item.delivery_address}</Text>
          <TouchableOpacity style={styles.button} onPress={() => handleAccept(item)}>
            <Text style={styles.buttonText}>Aceitar entrega</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40 },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  address: { marginBottom: 8 },
  button: { backgroundColor: "#0b63c9", borderRadius: 6, padding: 10, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
});
