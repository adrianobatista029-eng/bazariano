import type { NavigatorScreenParams } from "@react-navigation/native";

export type HomeTabParamList = {
  Home: undefined;
  Pedidos: undefined;
  Mensagens: undefined;
  Perfil: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: NavigatorScreenParams<HomeTabParamList>;
  ActiveDelivery: { orderId: string };
};
