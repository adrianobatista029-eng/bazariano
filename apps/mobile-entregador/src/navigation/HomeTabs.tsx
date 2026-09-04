import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "@/screens/HomeScreen";
import { AvailableOrdersScreen } from "@/screens/AvailableOrdersScreen";
import { PerfilScreen } from "@/screens/PerfilScreen";
import { ComingSoonScreen } from "@/screens/ComingSoonScreen";
import { FloatingNavBubble } from "./FloatingNavBubble";
import type { HomeTabParamList } from "./types";

const Tab = createBottomTabNavigator<HomeTabParamList>();

export function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingNavBubble {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Início" }} />
      <Tab.Screen name="Pedidos" component={AvailableOrdersScreen} options={{ title: "Pedidos" }} />
      <Tab.Screen name="Mensagens" options={{ title: "Mensagens" }}>
        {() => <ComingSoonScreen title="Mensagens" />}
      </Tab.Screen>
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ title: "Perfil" }} />
    </Tab.Navigator>
  );
}
