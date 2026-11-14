import React from "react";
import { useWindowDimensions } from "react-native";
import { useAppTheme } from "../context/ThemeContext";
import MonitoringScreen from "./MonitoringScreen";
import MobileMonitoringScreen from "./MobileMonitoringScreen";

export default function ResponsiveMonitoringScreen(props) {
  const { isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  return width <= 600 && isDark ? <MobileMonitoringScreen {...props} /> : <MonitoringScreen {...props} />;
}
