import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSettings, type VoiceType } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

const MOTS_SESSION_KEY = "@current_mots_session";
const PITCH_MAP: Record<VoiceType, number> = { H: 0.9, F: 1.1, Enfant: 1.4 };
const VOICE_LABELS: Record<VoiceType, string> = {
  H: "Homme",
  F: "Femme",
  Enfant: "Enfant",
};

const findFrenchVoice = async (voiceType: VoiceType): Promise<string | undefined> => {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const fr = voices.filter((v) => v.language?.startsWith("fr"));
    if (fr.length === 0) return undefined;
    if (voiceType === "H") {
      const male = fr.find(
        (v) =>
          v.name?.toLowerCase().includes("thomas") ||
          v.name?.toLowerCase().includes("nicolas") ||
          v.name?.toLowerCase().includes("jean")
      );
      return male?.identifier ?? fr[0]?.identifier;
    }
    const female = fr.find(
      (v) =>
        v.name?.toLowerCase().includes("amélie") ||
        v.name?.toLowerCase().includes("marguerite") ||
        v.name?.toLowerCase().includes("aurelie") ||
        v.name?.toLowerCase().includes("aurélie")
    );
    return female?.identifier ?? fr[0]?.identifier;
  } catch {
    return undefined;
  }
};

export default function DicteeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();
  const [mots, setMots] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const voiceIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem(MOTS_SESSION_KEY)
      .then((val) => {
        if (val) {
          const parsed = JSON.parse(val) as string[];
          setMots(parsed.filter((m) => m.trim().length > 0));
        }
      })
      .catch(() => {});

    findFrenchVoice(settings.voiceType).then((id) => {
      voiceIdRef.current = id;
    });

    return () => {
      Speech.stop();
    };
  }, [settings.voiceType]);

  const speakWord = useCallback(
    (word: string) => {
      Speech.stop();
      setIsPlaying(true);
      setRevealed(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const speakOptions: Speech.SpeechOptions = {
        language: "fr-FR",
        rate: settings.vitesse,
        pitch: PITCH_MAP[settings.voiceType],
        onDone: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      };
      if (voiceIdRef.current) {
        speakOptions.voice = voiceIdRef.current;
      }

      Speech.speak(word, speakOptions);
    },
    [settings],
  );

  const handleEcouter = useCallback(() => {
    if (mots.length === 0) return;
    speakWord(mots[index] ?? "");
  }, [mots, index, speakWord]);

  const handleNext = useCallback(() => {
    Speech.stop();
    setIsPlaying(false);
    setRevealed(false);
    if (index < mots.length - 1) {
      setIndex(index + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setFinished(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [index, mots.length]);

  const handlePrev = useCallback(() => {
    Speech.stop();
    setIsPlaying(false);
    setRevealed(false);
    if (index > 0) {
      setIndex(index - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [index]);

  const handleReveal = useCallback(() => {
    setRevealed((r) => !r);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleTerminer = useCallback(() => {
    Speech.stop();
    router.replace("/(tabs)");
  }, [router]);

  const handleRecommencer = useCallback(() => {
    Speech.stop();
    setIndex(0);
    setRevealed(false);
    setIsPlaying(false);
    setFinished(false);
  }, []);

  const styles = makeStyles(colors, insets);
  const isWeb = Platform.OS === "web";
  const progress = mots.length > 0 ? (index + 1) / mots.length : 0;

  if (finished) {
    return (
      <View style={[styles.container, styles.finishedContainer]}>
        <View
          style={[
            styles.finishedContent,
            { paddingTop: isWeb ? 67 + 40 : insets.top + 40 },
          ]}
        >
          <View style={styles.finishedIcon}>
            <Ionicons name="checkmark" size={52} color="#FFFFFF" />
          </View>
          <Text style={styles.finishedTitle}>Bravo !</Text>
          <Text style={styles.finishedSubtitle}>
            Tu as terminé ta dictée de{"\n"}
            <Text style={styles.finishedCount}>{mots.length} mot{mots.length > 1 ? "s" : ""}</Text>
          </Text>

          <View style={styles.finishedActions}>
            <Pressable
              onPress={handleRecommencer}
              style={({ pressed }) => [
                styles.recommencerButton,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="rotate-ccw" size={20} color={colors.primary} />
              <Text style={styles.recommencerText}>Recommencer</Text>
            </Pressable>
            <Pressable
              onPress={handleTerminer}
              style={({ pressed }) => [
                styles.terminerButton,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="home" size={20} color="#FFFFFF" />
              <Text style={styles.terminerText}>Accueil</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.topBar,
          { paddingTop: isWeb ? 67 : insets.top + 8 },
        ]}
      >
        <Pressable onPress={handleTerminer} style={styles.closeButton}>
          <Feather name="x" size={22} color="rgba(255,255,255,0.7)" />
        </Pressable>

        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>
            {index + 1} / {mots.length}
          </Text>
        </View>

        <View style={styles.settingsBadge}>
          <Text style={styles.settingsBadgeText}>
            {VOICE_LABELS[settings.voiceType]} · {VITESSE_LABELS[settings.vitesse]}
          </Text>
        </View>
      </View>

      <View style={styles.mainArea}>
        <Text style={styles.motLabel}>Mot n° {index + 1}</Text>

        <Pressable onPress={handleReveal} style={styles.revealCard}>
          {revealed ? (
            <Text style={styles.motRevealed}>{mots[index]}</Text>
          ) : (
            <View style={styles.hiddenArea}>
              <Feather name="eye-off" size={36} color="rgba(255,255,255,0.4)" />
              <Text style={styles.hiddenHint}>Appuie pour voir le mot</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={handleEcouter}
          disabled={isPlaying}
          style={({ pressed }) => [
            styles.ecouterButton,
            isPlaying && styles.ecouterButtonPlaying,
            pressed && styles.pressed,
          ]}
        >
          {isPlaying ? (
            <>
              <Ionicons name="volume-high" size={36} color="#FFFFFF" />
              <Text style={styles.ecouterText}>En cours...</Text>
            </>
          ) : (
            <>
              <Ionicons name="play-circle" size={36} color="#FFFFFF" />
              <Text style={styles.ecouterText}>Écouter</Text>
            </>
          )}
        </Pressable>
      </View>

      <View
        style={[
          styles.navBar,
          { paddingBottom: isWeb ? 34 : insets.bottom + 16 },
        ]}
      >
        <Pressable
          onPress={handlePrev}
          disabled={index === 0}
          style={({ pressed }) => [
            styles.navButton,
            index === 0 && styles.navButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Feather
            name="chevron-left"
            size={28}
            color={index === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.8)"}
          />
        </Pressable>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
        >
          {index < mots.length - 1 ? (
            <>
              <Text style={styles.nextButtonText}>Mot suivant</Text>
              <Feather name="chevron-right" size={22} color={colors.primary} />
            </>
          ) : (
            <>
              <Text style={styles.nextButtonText}>Terminer</Text>
              <Feather name="check" size={22} color={colors.success} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.secondary,
    },
    topBar: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 12,
    },
    closeButton: {
      alignSelf: "flex-start",
      padding: 4,
    },
    progressWrapper: {
      gap: 6,
    },
    progressTrack: {
      height: 6,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.accent,
      borderRadius: 3,
    },
    progressLabel: {
      fontFamily: "Geist_700Bold",
      fontSize: 13,
      color: "rgba(255,255,255,0.6)",
    },
    settingsBadge: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    settingsBadgeText: {
      fontFamily: "Geist_400Regular",
      fontSize: 12,
      color: "rgba(255,255,255,0.7)",
    },
    mainArea: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 24,
    },
    motLabel: {
      fontFamily: "Geist_700Bold",
      fontSize: 18,
      color: "rgba(255,255,255,0.6)",
      textTransform: "uppercase",
      letterSpacing: 2,
    },
    revealCard: {
      width: "100%",
      minHeight: 140,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: colors.radius + 4,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    motRevealed: {
      fontFamily: "Geist_800ExtraBold",
      fontSize: 48,
      color: "#FFFFFF",
      textAlign: "center",
    },
    hiddenArea: {
      alignItems: "center",
      gap: 12,
    },
    hiddenHint: {
      fontFamily: "Geist_400Regular",
      fontSize: 16,
      color: "rgba(255,255,255,0.4)",
    },
    ecouterButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.primary,
      borderRadius: colors.radius + 8,
      paddingHorizontal: 40,
      paddingVertical: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
    ecouterButtonPlaying: {
      backgroundColor: colors.accent,
    },
    ecouterText: {
      fontFamily: "Geist_800ExtraBold",
      fontSize: 24,
      color: "#FFFFFF",
    },
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.1)",
      gap: 12,
    },
    navButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    navButtonDisabled: {
      opacity: 0.3,
    },
    nextButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#FFFFFF",
      borderRadius: colors.radius,
      padding: 14,
    },
    nextButtonText: {
      fontFamily: "Geist_800ExtraBold",
      fontSize: 17,
      color: colors.foreground,
    },
    pressed: {
      opacity: 0.8,
      transform: [{ scale: 0.97 }],
    },
    finishedContainer: {
      backgroundColor: colors.success,
    },
    finishedContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 20,
    },
    finishedIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    finishedTitle: {
      fontFamily: "Geist_800ExtraBold",
      fontSize: 52,
      color: "#FFFFFF",
    },
    finishedSubtitle: {
      fontFamily: "Geist_400Regular",
      fontSize: 20,
      color: "rgba(255,255,255,0.85)",
      textAlign: "center",
      lineHeight: 30,
    },
    finishedCount: {
      fontFamily: "Geist_800ExtraBold",
      color: "#FFFFFF",
    },
    finishedActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 12,
    },
    recommencerButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#FFFFFF",
      borderRadius: colors.radius,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    recommencerText: {
      fontFamily: "Geist_700Bold",
      fontSize: 16,
      color: colors.success,
    },
    terminerButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: colors.radius,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    terminerText: {
      fontFamily: "Geist_700Bold",
      fontSize: 16,
      color: "#FFFFFF",
    },
  });
}
