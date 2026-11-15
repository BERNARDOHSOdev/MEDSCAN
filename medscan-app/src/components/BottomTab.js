import { useAppTheme } from "../context/ThemeContext";
import React from "react";
import { useDesktop } from "../utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fontFamily } from "../constants/theme";
import MedscanWordmark from "./MedscanWordmark";

const tabs = [
  { route: "Home", label: "Início", icon: "home-outline", activeIcon: "home" },
  { route: "History", label: "Prontuário", icon: "file-document-outline", activeIcon: "file-document" },
  { route: "Monitoring", label: "Monitorar", icon: "heart-pulse" },
  { route: "Profile", label: "Perfil", icon: "account-outline", activeIcon: "account" }
];

export default function BottomTab({ navigation, active = "Home" }) {
  const { colors, styles, isDark } = useAppTheme(createStyles);
  const insets = useSafeAreaInsets();
  const desktop = useDesktop();
  if (desktop) return <View style={styles.sidebar}>
    <View style={styles.logo}><MaterialCommunityIcons name="pulse" size={25} color={colors.primary} /><MedscanWordmark size={20} dark={colors.primary} light={colors.primaryMedium} /></View>
    <Text style={styles.menuCaption}>SEU ESPAÇO DE SAÚDE</Text>
    {[tabs[0], { route: "Analyze", label: "Conversar com IA", icon: "creation" }, ...tabs.slice(1), { route: "Notifications", label: "Notificações", icon: "bell-outline" }].map(tab => <TouchableOpacity key={tab.route} accessibilityRole="tab" accessibilityState={{ selected: active === tab.route }} onPress={() => navigation.navigate(tab.route)} style={[styles.navItem, active === tab.route && styles.selectedNav]}><MaterialCommunityIcons name={tab.icon} size={21} color={active === tab.route ? colors.white : colors.primary} /><Text style={[styles.navLabel, active === tab.route && { color: colors.white }]}>{tab.label}</Text></TouchableOpacity>)}
    <View style={styles.sidebarFoot}><MaterialCommunityIcons name="heart-outline" size={20} color={colors.primary} /><Text style={styles.footText}>{"Seu cuidado,\nmais perto."}</Text></View>
  </View>;
  return (
    <View style={[styles.shell, { bottom: Math.max(insets.bottom, 12) }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.route;
        return (
          <TouchableOpacity
            key={tab.route}
            onPress={() => {
              navigation.navigate(tab.route);
            }}
            activeOpacity={0.82}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            style={[styles.item, isActive && styles.activeItem]}
          >
            <MaterialCommunityIcons
              name={isActive ? tab.activeIcon || tab.icon : tab.icon}
              size={isActive ? 26 : 24}
              color={isActive ? colors.primary : isDark ? "#B9C9C5" : colors.textMuted}
            />
            <Text
              style={[styles.label, isActive && styles.activeLabel]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  sidebar: { position: "fixed", left: 0, top: 0, bottom: 0, width: 240, backgroundColor: colors.surface, padding: 22, borderRightWidth: 1, borderColor: colors.border, gap: 8 },
  logo: { flexDirection: "row", gap: 9, alignItems: "center", paddingVertical: 16, marginBottom: 32 },
  menuCaption: { fontFamily, fontSize: 9, letterSpacing: 1.2, color: colors.textMuted, marginBottom: 14 },
  navItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderRadius: 12 },
  selectedNav: { backgroundColor: colors.hero },
  navLabel: { fontFamily, fontSize: 13, fontWeight: "600", color: colors.text },
  sidebarFoot: { marginTop: "auto", padding: 18, borderRadius: 18, backgroundColor: colors.background, gap: 10 },
  footText: { fontFamily, fontSize: 14, lineHeight: 21, color: colors.primary },
  shell: {
    position: "absolute",
    width: "94%",
    maxWidth: 480,
    alignSelf: "center",
    minHeight: 76,
    borderRadius: 28,
    backgroundColor: colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#071917",
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8
  },
  item: {
    flex: 1,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 22,
    minWidth: 0
  },
  activeItem: { backgroundColor: colors.selectedSurface },
  label: {
    fontFamily, fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 0
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: "700"
  }
});

