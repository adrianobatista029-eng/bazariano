import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  listAvailableOrdersForCourier,
  acceptOrderAsCourier,
  type Database,
} from "@marketplace/supabase";
import { supabase } from "@/lib/supabase";
import { COLORS } from "@/theme";
import type { HomeTabParamList, RootStackParamList } from "@/navigation/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Props = CompositeScreenProps<
  BottomTabScreenProps<HomeTabParamList, "Pedidos">,
  NativeStackScreenProps<RootStackParamList>
>;

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
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.header}>Pedidos disponíveis</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadOrders} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum pedido disponível no momento.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.address}>{item.delivery_address}</Text>
            <TouchableOpacity style={styles.button} onPress={() => handleAccept(item)}>
              <Text style={styles.buttonText}>Aceitar entrega</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  list: { padding: 20, gap: 12 },
  empty: { textAlign: "center", color: COLORS.muted, marginTop: 40 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  address: { marginBottom: 10, color: COLORS.text },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "600" },
});
