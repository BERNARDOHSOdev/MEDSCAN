import { useAppTheme } from "../context/ThemeContext";
import React from "react";
import { StyleSheet, View } from "react-native";
import { radius, shadows } from "../constants/theme";

export default function Card({ children, style }) {
  const { colors, styles } = useAppTheme(createStyles);
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    ...shadows.card
  }
});
