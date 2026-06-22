import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const MOTS_SESSION_KEY = "@current_mots_session";
const MOTS_HISTORY_KEY = "@dictee_history";

interface HistoryItem {
  id: string;
  date: string;
  mots: string[];
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [lastSession, setLastSession] = useState<string[] | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(MOTS_SESSION_KEY)
      .then((val) => {
        if (val) setLastSession(JSON.parse(val) as string[]);
      })
      .catch(() => {});
    AsyncStorage.getItem(MOTS_HISTORY_KEY)
      .then((val) => {
        if (val) setHistory(JSON.parse(val) as HistoryItem[]);
      })
      .catch(() => {});
  }, []);

  const handleScanner = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/scanner");
  }, [router]);

  const handleContinuer = useCallback(() => {
    if (!lastSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/mots");
  }, [lastSession, router]);

  const handleParametres = useCallback(() => {
    router.push("/parametres");
  }, [router]);

  const styles = makeStyles(colors, insets);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          onPress={handleParametres}
          style={styles.settingsButton}
          testID="settings-button"
        >
          <Feather name="settings" size={24} color={colors.secondary} />
        </Pressable>
      </View>

      <View style={styles.heroSection}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.appTitle}>La Dictée</Text>
        <Text style={styles.appSubtitle}>
          Apprends à écrire les mots correctement
        </Text>
      </View>

      <View style={styles.actionsSection}>
        <Pressable
          onPress={handleScanner}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          testID="scanner-button"
        >
          <View style={styles.buttonInner}>
            <View style={styles.buttonIconWrap}>
              <Feather name="camera" size={28} color={colors.primaryForeground} />
            </View>
            <View style={styles.buttonTextGroup}>
              <Text style={styles.primaryButtonTitle}>Scanner une feuille</Text>
              <Text style={styles.primaryButtonSub}>
                Prendre une photo de tes mots
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={22}
              color={colors.primaryForeground}
            />
          </View>
        </Pressable>

        {lastSession && lastSession.length > 0 && (
          <Pressable
            onPress={handleContinuer}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.buttonInner}>
              <View
                style={[
                  styles.buttonIconWrap,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Feather
                  name="book-open"
                  size={28}
                  color={colors.secondaryForeground}
                />
              </View>
              <View style={styles.buttonTextGroup}>
                <Text style={styles.secondaryButtonTitle}>
                  Continuer la dernière dictée
                </Text>
                <Text style={styles.secondaryButtonSub}>
                  {lastSession.length} mot{lastSession.length > 1 ? "s" : ""}{" "}
                  enregistré{lastSession.length > 1 ? "s" : ""}
                </Text>
              </View>
              <Feather name="chevron-right" size={22} color={colors.secondary} />
            </View>
          </Pressable>
        )}
      </View>

      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Dictées récentes</Text>
          {history.slice(0, 3).map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.historyItem,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                AsyncStorage.setItem(
                  MOTS_SESSION_KEY,
                  JSON.stringify(item.mots),
                )
                  .then(() => {
                    setLastSession(item.mots);
                    router.push("/mots");
                  })
                  .catch(() => {});
              }}
            >
              <Feather name="clock" size={18} color={colors.mutedForeground} />
              <View style={styles.historyText}>
                <Text style={styles.historyDate}>{item.date}</Text>
                <Text style={styles.historyMots} numberOfLines={1}>
                  {item.mots.join(", ")}
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingTop: isWeb ? 67 : insets.top,
      paddingBottom: isWeb ? 34 : insets.bottom + 24,
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingVertical: 8,
    },
    settingsButton: {
      padding: 8,
    },
    heroSection: {
      alignItems: "center",
      paddingVertical: 32,
    },
    icon: {
      width: 100,
      height: 100,
      borderRadius: 22,
      marginBottom: 20,
    },
    appTitle: {
      fontFamily: "Nunito_800ExtraBold",
      fontSize: 42,
      color: colors.primary,
      letterSpacing: -1,
    },
    appSubtitle: {
      fontFamily: "Nunito_400Regular",
      fontSize: 17,
      color: colors.mutedForeground,
      marginTop: 8,
      textAlign: "center",
    },
    actionsSection: {
      gap: 14,
      marginBottom: 32,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    secondaryButton: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 2,
      borderColor: colors.secondary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    buttonInner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 18,
      gap: 14,
    },
    buttonIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    buttonTextGroup: {
      flex: 1,
    },
    primaryButtonTitle: {
      fontFamily: "Nunito_800ExtraBold",
      fontSize: 18,
      color: colors.primaryForeground,
    },
    primaryButtonSub: {
      fontFamily: "Nunito_400Regular",
      fontSize: 13,
      color: "rgba(255,255,255,0.75)",
      marginTop: 2,
    },
    secondaryButtonTitle: {
      fontFamily: "Nunito_700Bold",
      fontSize: 17,
      color: colors.secondary,
    },
    secondaryButtonSub: {
      fontFamily: "Nunito_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    historySection: {
      gap: 8,
    },
    sectionTitle: {
      fontFamily: "Nunito_700Bold",
      fontSize: 16,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
    },
    historyItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    historyText: {
      flex: 1,
    },
    historyDate: {
      fontFamily: "Nunito_700Bold",
      fontSize: 13,
      color: colors.mutedForeground,
    },
    historyMots: {
      fontFamily: "Nunito_400Regular",
      fontSize: 14,
      color: colors.foreground,
      marginTop: 2,
    },
  });
}
