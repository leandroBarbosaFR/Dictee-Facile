import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSettings, type VoiceType } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

const VOICE_OPTIONS: {
  type: VoiceType;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { type: "H", label: "Homme", sub: "Voix masculine", icon: "person" },
  { type: "F", label: "Femme", sub: "Voix féminine", icon: "person" },
  { type: "Enfant", label: "Enfant", sub: "Voix enfantine", icon: "happy" },
];

const PITCH_MAP: Record<VoiceType, number> = { H: 0.9, F: 1.1, Enfant: 1.4 };
const MIN_SPEED = 0.5;
const MAX_SPEED = 1.5;
const THUMB_RADIUS = 14;

interface SpeedSliderProps {
  value: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useColors>;
}

function SpeedSlider({ value, onChange, colors }: SpeedSliderProps) {
  const trackWidthRef = useRef(280);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const posFromValue = (v: number) =>
    ((v - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * trackWidthRef.current;

  const thumbX = useRef(new Animated.Value(posFromValue(value))).current;
  const offsetRef = useRef(posFromValue(value));

  useEffect(() => {
    const p = posFromValue(value);
    thumbX.setValue(p);
    offsetRef.current = p;
  }, [value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const x = event.nativeEvent.locationX;
        const tw = trackWidthRef.current;
        const newPos = Math.max(0, Math.min(tw, x));
        thumbX.setValue(newPos);
        offsetRef.current = newPos;
        const speed =
          MIN_SPEED + (newPos / tw) * (MAX_SPEED - MIN_SPEED);
        onChangeRef.current(Math.round(speed * 10) / 10);
      },
      onPanResponderMove: (_, gestureState) => {
        const tw = trackWidthRef.current;
        const newPos = Math.max(
          0,
          Math.min(tw, offsetRef.current + gestureState.dx),
        );
        thumbX.setValue(newPos);
        const speed =
          MIN_SPEED + (newPos / tw) * (MAX_SPEED - MIN_SPEED);
        onChangeRef.current(Math.round(speed * 10) / 10);
      },
      onPanResponderRelease: (_, gestureState) => {
        const tw = trackWidthRef.current;
        const newPos = Math.max(
          0,
          Math.min(tw, offsetRef.current + gestureState.dx),
        );
        offsetRef.current = newPos;
      },
    }),
  ).current;

  const LABELS = ["0.5×", "0.75×", "1×", "1.25×", "1.5×"];

  return (
    <View style={{ gap: 12 }}>
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width - THUMB_RADIUS * 2;
          trackWidthRef.current = w;
          thumbX.setValue(posFromValue(value));
          offsetRef.current = posFromValue(value);
        }}
        style={sliderStyles.wrapper}
        {...panResponder.panHandlers}
      >
        <View style={[sliderStyles.track, { backgroundColor: colors.muted }]}>
          <Animated.View
            style={[
              sliderStyles.fill,
              { backgroundColor: colors.primary, width: thumbX },
            ]}
          />
        </View>
        <Animated.View
          style={[
            sliderStyles.thumb,
            {
              backgroundColor: colors.primary,
              left: -THUMB_RADIUS,
              transform: [{ translateX: thumbX }],
              shadowColor: colors.primary,
            },
          ]}
        />
      </View>
      <View style={sliderStyles.labelRow}>
        {LABELS.map((l) => (
          <Text
            key={l}
            style={[sliderStyles.labelText, { color: colors.mutedForeground }]}
          >
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrapper: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: THUMB_RADIUS,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    width: THUMB_RADIUS * 2,
    height: THUMB_RADIUS * 2,
    borderRadius: THUMB_RADIUS,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: THUMB_RADIUS,
  },
  labelText: {
    fontFamily: "Geist_400Regular",
    fontSize: 11,
  },
});

export default function ParametresScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, setVoiceType, setVitesse } = useSettings();

  const handleTestVoice = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Speech.stop();
    Speech.speak("Bonjour ! Je suis ta voix pour la dictée.", {
      language: "fr-FR",
      rate: settings.vitesse,
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

  const handleVitesseChange = useCallback(
    (v: number) => {
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
                {active && <View style={styles.activeDot} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.vitesseHeader}>
          <View>
            <Text style={styles.sectionTitle}>Vitesse</Text>
            <Text style={styles.sectionSub}>Ajuste la rapidité de lecture</Text>
          </View>
          <View style={styles.vitesseBadge}>
            <Text
              style={[styles.vitesseBadgeText, { color: colors.primary }]}
            >
              {settings.vitesse.toFixed(1)}×
            </Text>
          </View>
        </View>
        <SpeedSlider
          value={settings.vitesse}
          onChange={handleVitesseChange}
          colors={colors}
        />
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

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>,
) {
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
      fontFamily: "Geist_800ExtraBold",
      fontSize: 22,
      color: colors.foreground,
    },
    sectionSub: {
      fontFamily: "Geist_400Regular",
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
      fontFamily: "Geist_800ExtraBold",
      fontSize: 17,
      color: colors.foreground,
    },
    voiceSub: {
      fontFamily: "Geist_400Regular",
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
    vitesseHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    vitesseBadge: {
      backgroundColor: `${colors.primary}15`,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    vitesseBadgeText: {
      fontFamily: "Geist_800ExtraBold",
      fontSize: 18,
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
      fontFamily: "Geist_800ExtraBold",
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
      fontFamily: "Geist_400Regular",
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
