import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type VoiceType = "H" | "F" | "Enfant";
export type DelaiSuivant = 0 | 2 | 5 | 10;

export interface Settings {
  voiceType: VoiceType;
  vitesse: number;
  repeterMot: boolean;
  delaiSuivant: DelaiSuivant;
}

interface SettingsContextType {
  settings: Settings;
  setVoiceType: (type: VoiceType) => void;
  setVitesse: (v: number) => void;
  setRepeterMot: (v: boolean) => void;
  setDelaiSuivant: (v: DelaiSuivant) => void;
}

const defaultSettings: Settings = {
  voiceType: "F",
  vitesse: 0.85,
  repeterMot: false,
  delaiSuivant: 0,
};

const STORAGE_KEY = "@dictee_settings_v1";

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  setVoiceType: () => {},
  setVitesse: () => {},
  setRepeterMot: () => {},
  setDelaiSuivant: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val) as Partial<Settings>;
            setSettings({ ...defaultSettings, ...parsed });
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
        setRepeterMot: (v) => save({ ...settings, repeterMot: v }),
        setDelaiSuivant: (v) => save({ ...settings, delaiSuivant: v }),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
