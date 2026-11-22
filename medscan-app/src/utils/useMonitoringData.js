import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import api from "../api/client";
import { DEFAULT_MONITORED_PERSON_ID, MONITORED_PERSON_STORAGE_KEY, getMonitoredPeople } from "./monitoredPeople";
import { getStoredItem, setStoredItem } from "./storage";

export default function useMonitoringData(user) {
  const [monitoring, setMonitoring] = useState({ vitals: {}, alerts: [] });
  const [devices, setDevices] = useState([]);
  const [devicesError, setDevicesError] = useState("");
  const [people, setPeople] = useState(() => getMonitoredPeople(user));
  const [selectedPersonId, setSelectedPersonId] = useState(DEFAULT_MONITORED_PERSON_ID);
  const [showPeopleMenu, setShowPeopleMenu] = useState(false);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    async function load() {
      try {
        const [profileResponse, monitoringResponse, devicesResponse] = await Promise.all([
          api.get("/profile"),
          api.get(`/monitoring?personId=${encodeURIComponent(selectedPersonId)}`),
          api.get("/devices")
        ]);
        if (!mounted) return;
        const profile = profileResponse.data.profile || {};
        const loadedPeople = getMonitoredPeople(profileResponse.data.user || user, profile.relatives || []);
        setPeople(loadedPeople);
        if (!loadedPeople.some(person => person.id === selectedPersonId)) {
          setSelectedPersonId(DEFAULT_MONITORED_PERSON_ID);
          await setStoredItem(MONITORED_PERSON_STORAGE_KEY, DEFAULT_MONITORED_PERSON_ID);
        }
        if (!mounted) return;
        setMonitoring(monitoringResponse.data);
        if (!Array.isArray(devicesResponse.data)) throw new Error("Lista de dispositivos inválida");
        setDevices(devicesResponse.data);
        setDevicesError("");
      } catch (_error) {
        if (mounted) { setMonitoring({ vitals: {}, alerts: [] }); setDevices([]); setDevicesError("Não foi possível carregar os dispositivos."); }
      }
    }
    load();
    return () => { mounted = false; };
  }, [selectedPersonId, user]));

  useEffect(() => {
    let mounted = true;
    getStoredItem(MONITORED_PERSON_STORAGE_KEY).then(storedId => {
      if (mounted && storedId) setSelectedPersonId(storedId);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  async function selectPerson(personId) {
    setSelectedPersonId(personId);
    setShowPeopleMenu(false);
    await setStoredItem(MONITORED_PERSON_STORAGE_KEY, personId);
  }

  return { monitoring, devices, devicesError, people, selectedPersonId, showPeopleMenu, setShowPeopleMenu, selectPerson };
}
