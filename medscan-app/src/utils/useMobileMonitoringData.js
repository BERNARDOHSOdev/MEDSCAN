import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import api from "../api/client";
import { DEFAULT_MONITORED_PERSON_ID, MONITORED_PERSON_STORAGE_KEY, getMonitoredPeople } from "./monitoredPeople";
import { getStoredItem, setStoredItem } from "./storage";

export default function useMobileMonitoringData(user, token) {
  const [selectedPersonId, setSelectedPersonId] = useState(DEFAULT_MONITORED_PERSON_ID);
  const [showPeopleMenu, setShowPeopleMenu] = useState(false);
  const [people, setPeople] = useState(() => getMonitoredPeople(user));
  const [monitoring, setMonitoring] = useState({ vitals: {}, alerts: [] });
  const [devices, setDevices] = useState([]);
  const [devicesError, setDevicesError] = useState("");

  useEffect(() => {
    let active = true;
    getStoredItem(MONITORED_PERSON_STORAGE_KEY).then(value => {
      if (active && value) setSelectedPersonId(value);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setPeople(getMonitoredPeople(user));
    setMonitoring({ vitals: {}, alerts: [] });
    setDevices([]);
    setDevicesError("");
    if (!token || !user) return () => { active = false; };

    Promise.allSettled([
      api.get("/profile"),
      api.get(`/monitoring?personId=${encodeURIComponent(selectedPersonId)}`),
      api.get("/devices")
    ]).then(results => {
      if (!active) return;
      if (results[0].status === "fulfilled") {
        const profile = results[0].value.data;
        const loaded = getMonitoredPeople(profile.user || user, profile.profile?.relatives || []);
        setPeople(loaded);
        if (!loaded.some(person => person.id === selectedPersonId)) {
          setSelectedPersonId(DEFAULT_MONITORED_PERSON_ID);
          setStoredItem(MONITORED_PERSON_STORAGE_KEY, DEFAULT_MONITORED_PERSON_ID).catch(() => {});
        }
      }
      if (results[1].status === "fulfilled") setMonitoring(results[1].value.data);
      if (results[2].status === "fulfilled" && Array.isArray(results[2].value.data)) setDevices(results[2].value.data);
      else setDevicesError("Não foi possível carregar os dispositivos.");
    });
    return () => { active = false; };
  }, [token, user, selectedPersonId]));

  async function selectPerson(personId) {
    setShowPeopleMenu(false);
    setSelectedPersonId(personId);
    await setStoredItem(MONITORED_PERSON_STORAGE_KEY, personId);
  }

  return { monitoring, devices, devicesError, people, selectedPersonId, showPeopleMenu, setShowPeopleMenu, selectPerson };
}
