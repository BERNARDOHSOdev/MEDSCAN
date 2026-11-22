import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import api from "../api/client";
import { getMonitoredPeople } from "./monitoredPeople";

export default function useCareData({ user, token, personId, setPersonId, section, revision, setActionError, setVisible }) {
  const [people, setPeople] = useState(() => getMonitoredPeople(user));
  const [records, setRecords] = useState([]);
  const [doses, setDoses] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useFocusEffect(useCallback(() => {
    let active = true;
    setRecords([]); setDoses([]); setAnalyses([]); setMeasurements([]);
    setErrors({}); setActionError(""); setVisible(30);
    if (!token || !user) { setLoading(false); return; }
    setLoading(true);
    const id = encodeURIComponent(personId);
    Promise.allSettled([
      api.get("/profile"),
      api.get(`/care?personId=${id}`),
      section === "timeline" ? api.get(`/history?personId=${id}`) : Promise.resolve({ data: [] }),
      ["timeline", "chart"].includes(section) ? api.get(`/monitoring/history?personId=${id}`) : Promise.resolve({ data: { records: [] } })
    ]).then(results => {
      if (!active) return;
      const issues = {};
      if (results[0].status === "fulfilled") {
        const data = results[0].value.data;
        const loaded = getMonitoredPeople(data.user || user, data.profile?.relatives || []);
        setPeople(loaded);
        if (!loaded.some(person => person.id === personId)) { setPersonId("self"); return; }
      } else issues.profile = "Não foi possível carregar a lista de pessoas.";
      const care = results[1];
      if (care.status === "fulfilled" && Array.isArray(care.value.data.records) && Array.isArray(care.value.data.doses)) {
        setRecords(care.value.data.records); setDoses(care.value.data.doses);
      } else issues.care = "Não foi possível carregar os registros desta seção. Atualize e tente novamente.";
      const history = results[2];
      if (history.status === "fulfilled" && Array.isArray(history.value.data)) setAnalyses(history.value.data);
      else issues.analyses = "Análises indisponíveis na linha do tempo.";
      const monitoring = results[3];
      if (monitoring.status === "fulfilled" && Array.isArray(monitoring.value.data.records)) setMeasurements(monitoring.value.data.records);
      else issues.measurements = "Medições indisponíveis. Não foi possível montar o gráfico completo.";
      setErrors(issues); setLoading(false);
    }).catch(() => {
      if (active) { setErrors({ care: "Não foi possível carregar o prontuário. Tente novamente." }); setLoading(false); }
    });
    return () => { active = false; };
  }, [user, token, personId, setPersonId, revision, section, setActionError, setVisible]));

  return { people, records, setRecords, doses, setDoses, analyses, measurements, loading, errors };
}
