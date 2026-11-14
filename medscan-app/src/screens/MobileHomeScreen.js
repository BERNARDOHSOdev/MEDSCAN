import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomTab from "../components/BottomTab";
import MedscanWordmark from "../components/MedscanWordmark";
import { useAuth } from "../context/AuthContext";
import { dailyCare, agendaDateLabel } from "../utils/dailyCare";
import { careRoutes } from "../utils/careRecords";
import { fontFamily } from "../constants/theme";
import api from "../api/client";

const ink = "#080C0D";
const surface = "#151D1F";
const line = "#344144";
const mint = "#2BE4AD";
const muted = "#B1BEC2";

function ActionCard({ icon, title, onPress }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} onPress={onPress} activeOpacity={0.78} style={s.actionCard}>
    <Icon name={icon} size={30} color="#F5FAF9" />
    <Text style={s.actionTitle}>{title}</Text>
  </TouchableOpacity>;
}

function SummaryRow({ icon, title, detail, onPress, badge }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${title}. ${detail}`} onPress={onPress} activeOpacity={0.76} style={s.familyRow}>
    <View style={s.summaryIcon}><Icon name={icon} size={28} color="#E9FFF7" /></View>
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
        <View style={s.brand}><LinearGradient colors={["#076E54", "#033B34"]} style={s.brandMark}><Icon name="pulse" size={29} color="#FFFFFF" /></LinearGradient><MedscanWordmark size={23} dark="#FFFFFF" light={mint} /></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notificações" onPress={() => navigation.navigate("Notifications")} style={s.bell}><Icon name="bell-outline" size={25} color="#F6FAF9" /></TouchableOpacity>
      </View>

      <View style={s.greetingBlock}><Text style={s.greeting}>{firstName ? `Olá, ${firstName}` : "Olá!"}</Text><Text style={s.subtitle}>Como podemos te ajudar hoje?</Text></View>

      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Analisar exame" onPress={() => navigation.navigate("Analyze", { type: "exam" })} activeOpacity={0.8} style={s.hero}>
        <LinearGradient colors={["#103D31", "#0D2826", "#102722"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
        <View style={s.plus}><Icon name="plus" size={35} color="#061812" /></View>
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
  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 145, maxWidth: 600, width: "100%", alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandMark: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#158F6D" },
  bell: { width: 44, height: 44, borderRadius: 14, backgroundColor: surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: line },
  greetingBlock: { marginTop: 64, marginBottom: 38 },
  greeting: { fontFamily, fontSize: 31, fontWeight: "700", letterSpacing: -1, color: "#F9FBFA" },
  subtitle: { fontFamily, fontSize: 15, color: muted, marginTop: 6 },
  hero: { minHeight: 224, borderRadius: 25, borderWidth: 1, borderColor: "#225448", overflow: "hidden", padding: 24, justifyContent: "flex-end" },
  plus: { width: 52, height: 52, borderRadius: 15, backgroundColor: mint, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  heroTitle: { fontFamily, fontSize: 25, fontWeight: "800", letterSpacing: -0.5, color: "#F9FBFA" },
  heroSubtitle: { fontFamily, fontSize: 15, lineHeight: 21, color: "#C5D4D0", maxWidth: "75%", marginTop: 6 },
  heroArrow: { position: "absolute", right: 20, bottom: 22, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#215A49" },
  actions: { flexDirection: "row", gap: 12, marginTop: 18 },
  actionCard: { flex: 1, minWidth: 0, minHeight: 154, borderRadius: 23, padding: 19, backgroundColor: surface, borderWidth: 1, borderColor: line, justifyContent: "space-between" },
  actionTitle: { fontFamily, fontSize: 17, lineHeight: 21, fontWeight: "700", color: "#F9FBFA" },
  followUp: { marginTop: 45, gap: 15 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontFamily, fontSize: 22, fontWeight: "700", color: "#F9FBFA", letterSpacing: -0.4, marginBottom: 4 },
  familyRow: { minHeight: 104, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 17, paddingHorizontal: 17, backgroundColor: surface, borderRadius: 22, borderWidth: 1, borderColor: line },
  summaryIcon: { width: 51, height: 51, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#0D493B" },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: { fontFamily, fontSize: 17, fontWeight: "700", color: "#F9FBFA" },
  summaryDetail: { fontFamily, fontSize: 13, lineHeight: 18, color: muted, marginTop: 4 },
  badge: { fontFamily, fontSize: 11, fontWeight: "700", color: mint, backgroundColor: "#0B4637", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14 },
  vitalStrip: { flexDirection: "row", minHeight: 130, backgroundColor: "#0D2420", borderWidth: 1, borderColor: "#245043", borderRadius: 23, paddingVertical: 20, paddingHorizontal: 8, marginTop: 42 },
  vital: { flex: 1, minWidth: 0, alignItems: "center", gap: 4, justifyContent: "center" },
  vitalDivider: { borderLeftWidth: 1, borderLeftColor: "#35534C" },
  vitalLabel: { fontFamily, fontSize: 12, color: "#D1DEDA" },
  vitalValue: { fontFamily, fontSize: 19, fontWeight: "800", color: "#F9FBFA" },
  vitalUnit: { fontSize: 10, fontWeight: "400", color: "#C1D0CB" },
  vitalNote: { fontFamily, color: "#869A95", fontSize: 11, lineHeight: 16, marginTop: 8, textAlign: "center" }
});
