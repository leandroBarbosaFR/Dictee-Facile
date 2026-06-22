import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import React, { useCallback } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSettings, type VoiceType, type Vitesse } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

const VOICE_OPTIONS: { type: VoiceType; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: "H", label: "Homme", sub: "Voix masculine", icon: "person" },
  { type: "F", label: "Femme", sub: "Voix féminine", icon: "person" },
  { type: "Enfant", label: "Enfant", sub: "Voix enfantine", icon: "happy" },
];

const VITESSE_OPTIONS: { value: Vitesse; label: string; sub: string }[] = [
  { value: 0, label: "Lente", sub: "0.5×" },
  { value: 1, label: "Normale", sub: "1×" },
  { value: 2, label: "Rapide", sub: "1.2×" },
];

const RATE_MAP = [0.5, 0.85, 1.1] as const;
const PITCH_MAP: Record<VoiceType, number> = { H: 0.9, F: 1.1, Enfant: 1.4 };

export default function ParametresScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, setVoiceType, setVitesse } = useSettings();

  const handleTestVoice = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Speech.stop();
    Speech.speak("Bonjour ! Je suis ta voix pour la dictée.", {
      language: "fr-FR",
      rate: RATE_MAP[settings.vitesse],
      pitch: PITCH_MAP[settings.voiceType],
      onError: () =>
        Alert.alert("Erreur", "Impossible de lire la voix sur cet appareil."),
    });
  }, [settings]);

  const handleVoiceSelect = useCallback(
    (type: VoiceType) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setVoiceType(type);
    },
    [setVoiceType],
  );

  const handleVitesseSelect = useCallback(
    (v: Vitesse) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setVitesse(v);
    },
    [setVitesse],
  );

  const styles = makeStyles(colors, insets);
  const isWeb = Platform.OS === "web";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: isWeb ? 34 : insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voix</Text>
        <Text style={styles.sectionSub}>
          Choisis comment les mots seront lus
        </Text>
        <View style={styles.optionsGrid}>
          {VOICE_OPTIONS.map((opt) => {
            const active = settings.voiceType === opt.type;
            return (
              <Pressable
                key={opt.type}
                onPress={() => handleVoiceSelect(opt.type)}
                style={({ pressed }) => [
                  styles.voiceCard,
                  active && styles.voiceCardActive,
                  pressed && styles.pressed,
                ]}
                testID={`voice-${opt.type}`}
              >
                <View
                  style={[
                    styles.voiceIconWrap,
                    active && { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={26}
                    color={active ? "#FFFFFF" : colors.mutedForeground}
                  />
                </View>
                <Text
                  style={[
                    styles.voiceLabel,
                    active && { color: colors.primary },
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.voiceSub}>{opt.sub}</Text>
                {active && (
                  <View style={styles.activeDot} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vitesse</Text>
        <Text style={styles.sectionSub}>Ajuste la rapidité de lecture</Text>
        <View style={styles.vitesseRow}>
          {VITESSE_OPTIONS.map((opt) => {
            const active = settings.vitesse === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handleVitesseSelect(opt.value)}
                style={({ pressed }) => [
                  styles.vitesseButton,
                  active && styles.vitesseButtonActive,
                  pressed && styles.pressed,
                ]}
                testID={`vitesse-${opt.value}`}
              >
                <Text
                  style={[
                    styles.vitesseLabel,
                    active && styles.vitesseLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[
                    styles.vitesseSub,
                    active && styles.vitesseSubActive,
                  ]}
                >
                  {opt.sub}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={handleTestVoice}
          style={({ pressed }) => [
            styles.testButton,
            pressed && styles.pressed,
          ]}
          testID="test-voice-button"
        >
          <Feather name="volume-2" size={22} color={colors.secondaryForeground} />
          <Text style={styles.testButtonText}>Tester la voix</Text>
        </Pressable>
      </View>

      <View style={styles.infoSection}>
        <Feather name="info" size={16} color={colors.mutedForeground} />
        <Text style={styles.infoText}>
          Les voix disponibles dépendent de ton appareil iOS. Si tu ne trouves
          pas de voix en français, va dans Réglages {">"} Accessibilité {">"}{" "}
          Contenu parlé {">"} Voix.
        </Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      gap: 28,
    },
    section: {
      gap: 14,
    },
    sectionTitle: {
      fontFamily: "Nunito_800ExtraBold",
      fontSize: 22,
      color: colors.foreground,
    },
    sectionSub: {
      fontFamily: "Nunito_400Regular",
      fontSize: 14,
      color: colors.mutedForeground,
      marginTop: -8,
    },
    optionsGrid: {
      flexDirection: "row",
      gap: 10,
    },
    voiceCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 16,
      alignItems: "center",
      gap: 8,
      borderWidth: 2,
      borderColor: colors.border,
    },
    voiceCardActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    voiceIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    voiceLabel: {
      fontFamily: "Nunito_800ExtraBold",
      fontSize: 17,
      color: colors.foreground,
    },
    voiceSub: {
      fontFamily: "Nunito_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    activeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    vitesseRow: {
      flexDirection: "row",
      gap: 10,
    },
    vitesseButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 16,
      alignItems: "center",
      gap: 4,
      borderWidth: 2,
      borderColor: colors.border,
    },
    vitesseButtonActive: {
      borderColor: colors.secondary,
      backgroundColor: `${colors.secondary}10`,
    },
    vitesseLabel: {
      fontFamily: "Nunito_800ExtraBold",
      fontSize: 16,
      color: colors.foreground,
    },
    vitesseLabelActive: {
      color: colors.secondary,
    },
    vitesseSub: {
      fontFamily: "Nunito_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
    },
    vitesseSubActive: {
      color: colors.secondary,
    },
    testButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.secondary,
      borderRadius: colors.radius,
      padding: 18,
      shadowColor: colors.secondary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    testButtonText: {
      fontFamily: "Nunito_800ExtraBold",
      fontSize: 18,
      color: colors.secondaryForeground,
    },
    infoSection: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      padding: 16,
    },
    infoText: {
      flex: 1,
      fontFamily: "Nunito_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 20,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
  });
}
