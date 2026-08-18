import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { COLORS } from "@/theme";

export function ComingSoonScreen({ title }: { title: string }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.icon}>🚧</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Em breve</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  icon: { fontSize: 36 },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.muted },
});
