import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "@/screens/HomeScreen";
import { AvailableOrdersScreen } from "@/screens/AvailableOrdersScreen";
import { PerfilScreen } from "@/screens/PerfilScreen";
import { ComingSoonScreen } from "@/screens/ComingSoonScreen";
import { COLORS } from "@/theme";
import type { HomeTabParamList } from "./types";

const Tab = createBottomTabNavigator<HomeTabParamList>();

const TAB_ICONS: Record<keyof HomeTabParamList, string> = {
  Home: "🏠",
  Buscas: "🔍",
  Pedidos: "📦",
  Mensagens: "💬",
  Perfil: "👤",
};

export function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.border },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 20, color }}>{TAB_ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Início" }} />
      <Tab.Screen name="Buscas" options={{ title: "Buscas" }}>
        {() => <ComingSoonScreen title="Buscas" />}
      </Tab.Screen>
      <Tab.Screen name="Pedidos" component={AvailableOrdersScreen} options={{ title: "Pedidos" }} />
      <Tab.Screen name="Mensagens" options={{ title: "Mensagens" }}>
        {() => <ComingSoonScreen title="Mensagens" />}
      </Tab.Screen>
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ title: "Perfil" }} />
    </Tab.Navigator>
  );
}
