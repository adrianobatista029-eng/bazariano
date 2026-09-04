import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { COLORS } from "@/theme";

// Mesmo padrão do botão flutuante do marketplace mobile: bolha no canto que
// expande numa coluna de atalhos (ícone + nome), com fundo escurecido atrás.
// Aqui troca a barra fixa de baixo inteira — ver `tabBar` no HomeTabs.

const ICONS: Record<string, ReturnType<typeof require> | null> = {
  Home: require("../assets/botao-home.png"),
  Pedidos: require("../assets/produtos.png"),
  Mensagens: null,
  Perfil: null,
};

const EMOJI_FALLBACK: Record<string, string> = {
  Mensagens: "💬",
  Perfil: "👤",
};

export function FloatingNavBubble({ state, descriptors, navigation }: BottomTabBarProps) {
  const [open, setOpen] = useState(false);

  const routes = state.routes;

  return (
    <>
      {open && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />
      )}

      <View style={styles.wrap} pointerEvents="box-none">
        {open &&
          routes.map((route) => {
            const { options } = descriptors[route.key];
            const label = (options.title ?? route.name) as string;
            const isFocused = state.index === routes.indexOf(route);
            const icon = ICONS[route.name];

            return (
              <TouchableOpacity
                key={route.key}
                style={styles.item}
                activeOpacity={0.85}
                onPress={() => {
                  setOpen(false);
                  navigation.navigate(route.name);
                }}
              >
                <Text style={[styles.label, isFocused && styles.labelActive]}>{label}</Text>
                <View style={[styles.iconCircle, isFocused && styles.iconCircleActive]}>
                  {icon ? (
                    <Image source={icon} style={styles.iconImage} resizeMode="contain" />
                  ) : (
                    <Text style={styles.iconEmoji}>{EMOJI_FALLBACK[route.name]}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

        <TouchableOpacity
          style={styles.trigger}
          activeOpacity={0.85}
          onPress={() => setOpen((v) => !v)}
        >
          <Image
            source={require("../assets/sinal-de-mais.png")}
            style={[styles.triggerIcon, open && styles.triggerIconOpen]}
          />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,13,25,0.6)",
    zIndex: 40,
  },
  wrap: {
    position: "absolute",
    right: 16,
    bottom: 24,
    alignItems: "flex-end",
    gap: 12,
    zIndex: 50,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 16,
    backgroundColor: "rgba(17,24,39,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  labelActive: { color: COLORS.accent },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleActive: { borderColor: COLORS.accent },
  iconImage: { width: 44, height: 44 },
  iconEmoji: { fontSize: 34 },
  trigger: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerIcon: { width: 80, height: 80 },
  triggerIconOpen: { transform: [{ rotate: "45deg" }] },
});
