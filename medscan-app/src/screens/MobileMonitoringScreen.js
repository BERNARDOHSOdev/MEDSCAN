import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import BottomTab from "../components/BottomTab";
import { useAuth } from "../context/AuthContext";
import { fontFamily } from "../constants/theme";
import { demoVitals } from "../utils/demoVitals";
import { findMonitoredPerson } from "../utils/monitoredPeople";
import useMobileMonitoringData from "../utils/useMobileMonitoringData";

const ink = "#080C0D";
const surface = "#1A2020";
const line = "#2E3937";
const mint = "#8BCDB0";
const muted = "#B5BFBA";

function VitalCard({ icon, title, value, unit, isDemo }) {
  return <View style={s.vitalCard} accessibilityLabel={`${title}: ${value} ${unit}. ${isDemo ? "Demonstração" : "Registrado"}`}>
    <View style={s.vitalIcon}><Icon name={icon} size={34} color={mint} /></View>
    <Text style={s.vitalTitle} numberOfLines={2}>{title}</Text>
    <Text style={s.vitalReading} numberOfLines={1}>{value}<Text style={s.vitalUnit}>{unit ? ` ${unit}` : ""}</Text></Text>
    <Text style={s.vitalStatus}>{isDemo ? "Demonstração" : "Registrado"}</Text>
  </View>;
}

export default function MobileMonitoringScreen({ navigation }) {
  const { user, token } = useAuth();
  const { monitoring, devices, devicesError, people, selectedPersonId, showPeopleMenu, setShowPeopleMenu, selectPerson } = useMobileMonitoringData(user, token);
  const selectedPerson = findMonitoredPerson(selectedPersonId, people);
  const vitals = monitoring.vitals || {};
  const alerts = Array.isArray(monitoring.alerts) ? monitoring.alerts : [];
  const hasDemoVitals = ["heartRate", "glucose", "bloodPressure", "sleep"].some(key => vitals[key] == null);
  const metricItems = [
    ["heart-pulse", "Frequência cardíaca", vitals.heartRate ?? demoVitals.heartRate, "bpm", vitals.heartRate == null],
    ["water-outline", "Glicose", vitals.glucose ?? demoVitals.glucose, "mg/dL", vitals.glucose == null],
    ["gauge", "Pressão arterial", vitals.bloodPressure ?? demoVitals.bloodPressure, "mmHg", vitals.bloodPressure == null],
    ["sleep", "Sono", vitals.sleep ?? demoVitals.sleep, "", vitals.sleep == null]
  ];

  return <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={s.brandRow}>
        <Text style={s.brandText}>MedScan</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notificações" onPress={() => navigation.navigate("Notifications")} style={s.bell}><Icon name="bell-outline" size={25} color="#F0F4F1" /></TouchableOpacity>
      </View>

      <View style={s.heading}><Text style={s.pageTitle}>Monitoramento</Text><Text style={s.pageSubtitle}>Acompanhe os sinais vitais de quem você cuida.</Text></View>

      <View style={s.personCard}>
        <View style={s.personTop}>
          <View style={s.avatar}><Icon name={selectedPerson.icon || "account-circle-outline"} size={37} color={mint} /></View>
          <View style={s.personCopy}><Text style={s.personName} numberOfLines={2}>{selectedPerson.name === "Voce" ? "Você" : selectedPerson.name}</Text><Text style={s.personMeta} numberOfLines={2}>{selectedPerson.age != null ? `${selectedPerson.age} anos · ` : ""}{selectedPerson.relation}</Text></View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={showPeopleMenu ? "Fechar lista de pessoas" : "Trocar pessoa monitorada"} onPress={() => setShowPeopleMenu(current => !current)} style={s.switchButton}><Icon name={showPeopleMenu ? "chevron-up" : "chevron-down"} size={25} color="#EAF3EC" /></TouchableOpacity>
        </View>
        <View style={s.personBottom}><View style={s.statusPill}><View style={s.statusDot}/><Text style={s.statusText}>{hasDemoVitals ? "Dados de demonstração" : monitoring.monitoredPerson?.status || "Medições registradas"}</Text></View><TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate("Profile")} style={s.profileLink}><Text style={s.profileLinkText}>Ver perfil</Text><Icon name="arrow-right" size={17} color={mint} /></TouchableOpacity></View>
      </View>

      {showPeopleMenu ? <View style={s.peopleMenu}>
        <Text style={s.menuTitle}>Trocar pessoa monitorada</Text>
        {people.map(person => <TouchableOpacity key={person.id} accessibilityRole="button" accessibilityState={{ selected: person.id === selectedPersonId }} onPress={() => selectPerson(person.id)} style={[s.personOption, person.id === selectedPersonId && s.personOptionActive]}><Icon name={person.icon || "account-circle-outline"} size={27} color={mint}/><View style={s.optionCopy}><Text style={s.optionName}>{person.name}</Text><Text style={s.optionMeta}>{person.relation}</Text></View>{person.id === selectedPersonId ? <Icon name="check" size={20} color={mint}/> : null}</TouchableOpacity>)}
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate("Profile", { openFamilyForm: true })} style={s.personOption}><Icon name="plus-circle-outline" size={27} color={mint}/><Text style={s.optionName}>Adicionar pessoa</Text></TouchableOpacity>
      </View> : null}

      <View style={s.sectionHeading}><Text style={s.sectionTitle}>Sinais vitais</Text><TouchableOpacity accessibilityRole="button" onPress={() => token ? navigation.navigate("History", { personId: selectedPersonId, openMeasurement: true, revision: Date.now() }) : navigation.navigate("Login", { returnToPrevious: true })} style={s.measureButton}><Icon name="plus" size={20} color={mint}/><Text style={s.measureText}>Registrar</Text></TouchableOpacity></View>
      <View style={s.vitalGrid}>{metricItems.map(([icon, title, value, unit, isDemo]) => <VitalCard key={title} icon={icon} title={title} value={value} unit={unit} isDemo={isDemo}/>)}</View>
      {hasDemoVitals ? <Text style={s.note}>Valores identificados como demonstração não são medições de dispositivos.</Text> : null}

      <View style={s.sectionHeading}><Text style={s.sectionTitle}>Alertas e lembretes</Text><TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate("Notifications")}><Text style={s.sectionLink}>Ver todos</Text></TouchableOpacity></View>
      {alerts.length ? alerts.map((alert, index) => <View key={`${alert.title}-${index}`} style={s.infoCard}><View style={s.infoIcon}><Icon name={alert.level === "Atencao" || alert.level === "Atenção" ? "alert-outline" : "pill"} size={31} color={mint}/></View><View style={s.infoCopy}><Text style={s.infoTitle}>{alert.title}</Text><Text style={s.infoDetail}>{alert.description}</Text></View></View>) : <View style={s.infoCard}><View style={s.infoIcon}><Icon name="bell-check-outline" size={31} color={mint}/></View><View style={s.infoCopy}><Text style={s.infoTitle}>Nenhum alerta para exibir</Text><Text style={s.infoDetail}>Seus alertas e lembretes aparecerão aqui.</Text></View></View>}

      <View style={s.sectionHeading}><Text style={s.sectionTitle}>Dispositivos</Text></View>
      {devices.map(device => <View key={device._id || device.name} style={s.infoCard}><View style={s.infoIcon}><Icon name="watch-variant" size={31} color={mint}/></View><View style={s.infoCopy}><Text style={s.infoTitle}>{device.name}</Text><Text style={s.infoDetail}>Conexão não verificada</Text></View></View>)}
      <Text style={s.note}>{!token ? "Entre na conta para ver seus dispositivos." : devicesError || (devices.length ? "A conexão e a bateria destes dispositivos não são verificadas pelo aplicativo." : "Nenhum dispositivo cadastrado. A conexão automática ainda não está disponível.")}</Text>
    </ScrollView>
    <BottomTab navigation={navigation} active="Monitoring" mobileHome />
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ink },
  content: { width: "100%", maxWidth: 600, alignSelf: "center", paddingHorizontal: 14, paddingTop: 28, paddingBottom: 145 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandText: { fontFamily, fontStyle: "italic", fontSize: 24, fontWeight: "500", letterSpacing: -0.6, color: "#F2F6F2" },
  bell: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  heading: { marginTop: 60, marginBottom: 28 },
  pageTitle: { fontFamily, fontStyle: "italic", fontSize: 31, fontWeight: "600", letterSpacing: -0.8, color: "#F9FBFA" },
  pageSubtitle: { fontFamily, fontStyle: "italic", color: muted, fontSize: 15, lineHeight: 21, marginTop: 6 },
  personCard: { backgroundColor: "#20352D", borderWidth: 1, borderColor: "#344D42", borderRadius: 25, padding: 19, gap: 18 },
  personTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 55, height: 55, borderRadius: 16, backgroundColor: "#315344", alignItems: "center", justifyContent: "center" },
  personCopy: { flex: 1, minWidth: 0 },
  personName: { fontFamily, fontStyle: "italic", fontSize: 21, fontWeight: "600", color: "#F9FBFA" },
  personMeta: { fontFamily, fontStyle: "italic", fontSize: 13, color: muted, marginTop: 4 },
  switchButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  personBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#2A493B", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, flexShrink: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: mint },
  statusText: { fontFamily, fontStyle: "italic", fontSize: 11, color: "#BBDCCB", flexShrink: 1 },
  profileLink: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 40 },
  profileLinkText: { fontFamily, fontStyle: "italic", fontSize: 12, color: mint },
  peopleMenu: { marginTop: 10, padding: 13, borderWidth: 1, borderColor: line, borderRadius: 20, backgroundColor: surface, gap: 4 },
  menuTitle: { fontFamily, fontStyle: "italic", fontSize: 15, color: "#F9FBFA", marginBottom: 4 },
  personOption: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 61, paddingHorizontal: 10, borderRadius: 14 },
  personOptionActive: { backgroundColor: "#294438" },
  optionCopy: { flex: 1 },
  optionName: { fontFamily, fontStyle: "italic", fontSize: 15, color: "#F9FBFA" },
  optionMeta: { fontFamily, fontStyle: "italic", fontSize: 12, color: muted, marginTop: 2 },
  sectionHeading: { marginTop: 35, marginBottom: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { fontFamily, fontStyle: "italic", fontSize: 22, fontWeight: "500", color: "#F9FBFA" },
  sectionLink: { fontFamily, fontStyle: "italic", fontSize: 12, color: mint },
  measureButton: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 42, paddingHorizontal: 10, borderRadius: 20, backgroundColor: "#294438" },
  measureText: { fontFamily, fontStyle: "italic", fontSize: 12, color: mint },
  vitalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vitalCard: { width: "48%", flexGrow: 1, minWidth: 0, minHeight: 176, padding: 17, backgroundColor: surface, borderWidth: 1, borderColor: line, borderRadius: 22, justifyContent: "space-between" },
  vitalIcon: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  vitalTitle: { fontFamily, fontStyle: "italic", fontSize: 14, color: muted, lineHeight: 18 },
  vitalReading: { fontFamily, fontStyle: "italic", fontSize: 24, fontWeight: "600", color: "#F9FBFA" },
  vitalUnit: { fontSize: 11, fontWeight: "400", color: muted },
  vitalStatus: { fontFamily, fontStyle: "italic", fontSize: 11, color: mint },
  note: { fontFamily, fontStyle: "italic", fontSize: 11, lineHeight: 16, color: "#91A39B", marginTop: 10 },
  infoCard: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: 13, padding: 17, marginBottom: 10, backgroundColor: surface, borderWidth: 1, borderColor: line, borderRadius: 22 },
  infoIcon: { width: 51, height: 51, borderRadius: 15, backgroundColor: "#28473A", alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1, minWidth: 0 },
  infoTitle: { fontFamily, fontStyle: "italic", fontSize: 16, fontWeight: "600", color: "#F9FBFA" },
  infoDetail: { fontFamily, fontStyle: "italic", fontSize: 13, lineHeight: 18, color: muted, marginTop: 4 }
});
