import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type VoiceType = "H" | "F" | "Enfant";

export interface Settings {
  voiceType: VoiceType;
  vitesse: number;
}

interface SettingsContextType {
  settings: Settings;
  setVoiceType: (type: VoiceType) => void;
  setVitesse: (v: number) => void;
}

const defaultSettings: Settings = {
  voiceType: "F",
  vitesse: 0.85,
};

const STORAGE_KEY = "@dictee_settings_v1";

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  setVoiceType: () => {},
  setVitesse: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val) as Settings;
            setSettings(parsed);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const save = (next: Settings) => {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setVoiceType: (type) => save({ ...settings, voiceType: type }),
        setVitesse: (v) => save({ ...settings, vitesse: v }),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
