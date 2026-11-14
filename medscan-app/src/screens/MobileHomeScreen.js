import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomTab from "../components/BottomTab";
import { useAuth } from "../context/AuthContext";
import { dailyCare, agendaDateLabel } from "../utils/dailyCare";
import { careRoutes } from "../utils/careRecords";
import { fontFamily } from "../constants/theme";
import api from "../api/client";

const ink = "#080C0D";
const surface = "#1A2020";
const line = "#2E3937";
const mint = "#8BCDB0";
const muted = "#B5BFBA";

function ActionCard({ icon, title, onPress }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} onPress={onPress} activeOpacity={0.78} style={s.actionCard}>
    <Icon name={icon} size={38} color="#E7EEEA" />
    <Text style={s.actionTitle}>{title}</Text>
  </TouchableOpacity>;
}

function SummaryRow({ icon, title, detail, onPress, badge }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${title}. ${detail}`} onPress={onPress} activeOpacity={0.76} style={s.familyRow}>
    <View style={s.summaryIcon}><Icon name={icon} size={32} color="#E9F4ED" /></View>
    <View style={s.summaryCopy}><Text style={s.summaryTitle} numberOfLines={1}>{title}</Text><Text style={s.summaryDetail} numberOfLines={2}>{detail}</Text></View>
    {badge ? <Text style={s.badge}>{badge}</Text> : null}
    <Icon name="chevron-right" size={25} color="#F0F6F4" />
  </TouchableOpacity>;
}

export default function MobileHomeScreen({ navigation, user }) {
  const { token } = useAuth();
  const scope = `${user?._id || user?.id || "guest"}:${token || ""}`;
  const [data, setData] = useState({ scope: "", status: "loading", records: [], doses: [], relatives: 0, vitals: {} });
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setData({ scope, status: token && user ? "loading" : "guest", records: [], doses: [], relatives: 0, vitals: {} });
    if (token && user) {
      Promise.allSettled([api.get("/care?personId=self"), api.get("/profile"), api.get("/monitoring?personId=self")]).then(results => {
        if (!active) return;
        const care = results[0].status === "fulfilled" ? results[0].value.data : null;
        const profile = results[1].status === "fulfilled" ? results[1].value.data : null;
        const monitoring = results[2].status === "fulfilled" ? results[2].value.data : null;
        setData({
          scope,
          status: Array.isArray(care?.records) && Array.isArray(care?.doses) ? "ready" : "error",
          records: Array.isArray(care?.records) ? care.records : [],
          doses: Array.isArray(care?.doses) ? care.doses : [],
          relatives: Array.isArray(profile?.profile?.relatives) ? profile.profile.relatives.length : 0,
          vitals: monitoring?.vitals || {}
        });
      });
    }
    return () => { active = false; };
  }, [scope, token, user, revision]));

  const firstName = user?.name?.trim().split(/\s+/)[0];
  const status = !token || !user ? "guest" : data.scope === scope ? data.status : "loading";
  const openMedication = () => navigation.navigate(careRoutes.medication, { section: "medication", personId: "self", revision: Date.now() });
  const openCare = (kind, date) => navigation.navigate(careRoutes[kind], { section: kind, personId: "self", agendaDate: date, revision: Date.now() });
  const now = new Date();
  const summary = dailyCare(status === "ready" ? data.records : [], status === "ready" ? data.doses : [], now);
  const medication = summary.medication;
  const appointment = summary.appointment;
  const medicationDetail = status === "guest" ? "Entre para ver seus horários" : medication ? `${agendaDateLabel(medication.date, now)}, às ${medication.time} · Conforme prescrição` : summary.pendingEarlier ? "Confira os horários anteriores na agenda" : "Nenhum horário programado";
  const appointmentDetail = status === "guest" ? "Entre para ver sua agenda" : appointment ? `${agendaDateLabel(appointment.date, now)}, às ${appointment.time}` : "Agenda livre · Marque seu próximo atendimento";
  const vitalItems = [
    ["water-outline", "Glicose", data.vitals.glucose, "mg/dL"],
    ["heart-pulse", "Frequência", data.vitals.heartRate, "bpm"],
    ["gauge", "Pressão", data.vitals.bloodPressure, "mmHg"]
  ];

  return <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={s.brandRow}>
        <Text style={s.brandText}>MedScan</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notificações" onPress={() => navigation.navigate("Notifications")} style={s.bell}><Icon name="bell-outline" size={25} color="#F6FAF9" /></TouchableOpacity>
      </View>

      <View style={s.greetingBlock}><Text style={s.greeting}>{firstName ? `Olá, ${firstName}` : "Olá!"}</Text><Text style={s.subtitle}>Como podemos te ajudar hoje?</Text></View>

      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Analisar exame" onPress={() => navigation.navigate("Analyze", { type: "exam" })} activeOpacity={0.8} style={s.hero}>
        <LinearGradient colors={["#2A4438", "#1F352E", "#172C26"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
        <View style={s.plus}><Icon name="plus" size={40} color="#173026" /></View>
        <Text style={s.heroTitle}>Analisar exame</Text>
        <Text style={s.heroSubtitle}>Envie um exame ou imagem para análise com IA</Text>
        <View style={s.heroArrow}><Icon name="arrow-right" size={29} color="#F5FBF8" /></View>
      </TouchableOpacity>

      <View style={s.actions}>
        <ActionCard icon="stethoscope" title="Avaliar sintomas" onPress={() => navigation.navigate("Analyze", { type: "symptoms" })} />
        <ActionCard icon="alarm" title="Lembretes de medicamentos" onPress={openMedication} />
      </View>

      <View style={s.followUp}>
        <View style={s.sectionHead}><Text style={s.sectionTitle}>Resumo do dia</Text>{status === "loading" ? <ActivityIndicator color={mint} /> : null}</View>
        {status === "error" ? <SummaryRow icon="refresh" title="Agenda indisponível" detail="Toque para tentar novamente" onPress={() => setRevision(value => value + 1)} /> : <>
          <SummaryRow icon="pill" title={medication?.record?.name || "Medicamentos"} detail={status === "loading" ? "Carregando seus horários…" : medicationDetail} badge={status === "ready" && (medication || summary.pendingEarlier) ? "Pendente" : undefined} onPress={() => status === "guest" ? navigation.navigate("Login", { returnToPrevious: true }) : openCare("medication", medication?.date || summary.firstEarlier?.date)} />
          <SummaryRow icon="calendar-blank-outline" title="Consultas" detail={status === "loading" ? "Carregando sua agenda…" : appointmentDetail} onPress={() => status === "guest" ? navigation.navigate("Login", { returnToPrevious: true }) : openCare("appointment", appointment?.date)} />
        </>}
        <SummaryRow icon="account-group-outline" title={data.relatives ? "Familiar vinculado" : "Minha família"} detail={status === "guest" ? "Entre para acompanhar seus familiares" : data.relatives ? `${data.relatives} ${data.relatives === 1 ? "pessoa em monitoramento" : "pessoas em monitoramento"}` : "Adicione alguém para acompanhar"} onPress={() => navigation.navigate(status === "guest" ? "Login" : "Profile", status === "guest" ? { returnToPrevious: true } : undefined)} />
      </View>

      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Abrir monitoramento" onPress={() => navigation.navigate("Monitoring")} activeOpacity={0.8} style={s.vitalStrip}>
        {vitalItems.map(([icon, label, value, unit], index) => <View key={label} style={[s.vital, index > 0 && s.vitalDivider]}><Icon name={icon} size={27} color={mint} /><Text style={s.vitalLabel} numberOfLines={1}>{label}</Text><Text style={s.vitalValue} numberOfLines={1}>{value ?? "—"}<Text style={s.vitalUnit}>{value == null ? "" : ` ${unit}`}</Text></Text></View>)}
      </TouchableOpacity>
      <Text style={s.vitalNote}>{vitalItems.every(([, , value]) => value == null) ? "Sem medições registradas. Toque para abrir o monitoramento." : "Últimas medições registradas. Traço indica dado ausente."}</Text>
    </ScrollView>
    <BottomTab navigation={navigation} active="Home" mobileHome />
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ink },
  content: { paddingHorizontal: 14, paddingTop: 28, paddingBottom: 145, maxWidth: 600, width: "100%", alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandText: { fontFamily, fontStyle: "italic", fontSize: 24, fontWeight: "500", letterSpacing: -0.6, color: "#F2F6F2" },
  bell: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  greetingBlock: { marginTop: 60, marginBottom: 28 },
  greeting: { fontFamily, fontStyle: "italic", fontSize: 31, fontWeight: "600", letterSpacing: -0.8, color: "#F9FBFA" },
  subtitle: { fontFamily, fontStyle: "italic", fontSize: 15, color: muted, marginTop: 6 },
  hero: { minHeight: 224, borderRadius: 25, borderWidth: 1, borderColor: "#334D43", overflow: "hidden", padding: 24, justifyContent: "flex-end" },
  plus: { width: 55, height: 55, borderRadius: 15, backgroundColor: mint, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  heroTitle: { fontFamily, fontStyle: "italic", fontSize: 25, fontWeight: "600", letterSpacing: -0.4, color: "#F9FBFA" },
  heroSubtitle: { fontFamily, fontStyle: "italic", fontSize: 15, lineHeight: 21, color: "#CEDBD1", maxWidth: "75%", marginTop: 6 },
  heroArrow: { position: "absolute", right: 20, bottom: 22, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#2E5043" },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionCard: { flex: 1, minWidth: 0, minHeight: 154, borderRadius: 23, padding: 19, backgroundColor: surface, borderWidth: 1, borderColor: line, justifyContent: "space-between" },
  actionTitle: { fontFamily, fontStyle: "italic", fontSize: 17, lineHeight: 21, fontWeight: "500", color: "#F9FBFA" },
  followUp: { marginTop: 32, gap: 12 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontFamily, fontStyle: "italic", fontSize: 22, fontWeight: "500", color: "#F9FBFA", letterSpacing: -0.3, marginBottom: 4 },
  familyRow: { minHeight: 104, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 17, paddingHorizontal: 17, backgroundColor: surface, borderRadius: 22, borderWidth: 1, borderColor: line },
  summaryIcon: { width: 54, height: 54, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#28473A" },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: { fontFamily, fontStyle: "italic", fontSize: 17, fontWeight: "600", color: "#F9FBFA" },
  summaryDetail: { fontFamily, fontStyle: "italic", fontSize: 13, lineHeight: 18, color: muted, marginTop: 4 },
  badge: { fontFamily, fontStyle: "italic", fontSize: 11, fontWeight: "600", color: mint, backgroundColor: "#24463A", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14 },
  vitalStrip: { flexDirection: "row", minHeight: 130, backgroundColor: "#1B3029", borderWidth: 1, borderColor: "#385348", borderRadius: 23, paddingVertical: 20, paddingHorizontal: 8, marginTop: 30 },
  vital: { flex: 1, minWidth: 0, alignItems: "center", gap: 4, justifyContent: "center" },
  vitalDivider: { borderLeftWidth: 1, borderLeftColor: "#35534C" },
  vitalLabel: { fontFamily, fontStyle: "italic", fontSize: 12, color: "#D1DEDA" },
  vitalValue: { fontFamily, fontStyle: "italic", fontSize: 19, fontWeight: "600", color: "#F9FBFA" },
  vitalUnit: { fontStyle: "italic", fontSize: 10, fontWeight: "400", color: "#C1D0CB" },
  vitalNote: { fontFamily, fontStyle: "italic", color: "#91A39B", fontSize: 11, lineHeight: 16, marginTop: 8, textAlign: "center" }
});
