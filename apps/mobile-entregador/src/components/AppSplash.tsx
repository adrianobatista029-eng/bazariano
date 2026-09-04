import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, Image, StyleSheet } from "react-native";
import { COLORS } from "@/theme";

const ANIMATION_MS = 2400;
const GROW_MS = 550;
const SPIN_MS = 2200;

// Igual o splash do iFood: o ícone nasce pequeno e cresce rápido/dramático
// até quase preencher a tela, ao invés de um zoom sutil. As setas laranjas
// continuam girando por cima disso (efeito nosso, o iFood não tem).
// Roda sempre que o app abre do zero — sair sem fechar não remonta esse
// componente, só matar o processo e reabrir faz isso tocar de novo.
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SPLASH_SIZE = Math.min(SCREEN_WIDTH * 0.85, SCREEN_HEIGHT * 0.55);

export function AppSplash({ onFinish }: { onFinish: () => void }) {
  const wrapOpacity = useRef(new Animated.Value(0)).current;
  const wrapScale = useRef(new Animated.Value(0.25)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(wrapOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(wrapScale, {
          toValue: 1,
          duration: GROW_MS,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(ANIMATION_MS - GROW_MS - 400),
      Animated.parallel([
        Animated.timing(wrapOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(wrapScale, {
          toValue: 1.08,
          duration: 400,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onFinish());

    Animated.timing(spin, {
      toValue: 1,
      duration: SPIN_MS,
      easing: Easing.bezier(0.65, 0, 0.35, 1),
      useNativeDriver: true,
    }).start();
  }, [wrapOpacity, wrapScale, spin, onFinish]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "760deg"],
  });

  return (
    <Animated.View
      style={[styles.overlay, { opacity: wrapOpacity }]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.wrap, { transform: [{ scale: wrapScale }] }]}>
        <Image source={require("../assets/splash-compass.png")} style={styles.layer} />
        <Animated.Image
          source={require("../assets/splash-arrows.png")}
          style={[styles.layer, { transform: [{ rotate }] }]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  wrap: {
    width: SPLASH_SIZE,
    height: SPLASH_SIZE,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
});
