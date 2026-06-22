import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const MOTS_SESSION_KEY = "@current_mots_session";

export default function MotsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mots, setMots] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(MOTS_SESSION_KEY)
      .then((val) => {
        if (val) setMots(JSON.parse(val) as string[]);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const saveMots = useCallback((newMots: string[]) => {
    setMots(newMots);
    AsyncStorage.setItem(MOTS_SESSION_KEY, JSON.stringify(newMots)).catch(
      () => {},
    );
  }, []);

  const updateMot = useCallback(
    (index: number, value: string) => {
      const next = [...mots];
      next[index] = value;
      saveMots(next);
    },
    [mots, saveMots],
  );

  const deleteMot = useCallback(
    (index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = mots.filter((_, i) => i !== index);
      saveMots(next);
      if (editingIndex === index) setEditingIndex(null);
    },
    [mots, saveMots, editingIndex],
  );

  const addMot = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = [...mots, ""];
    saveMots(next);
    setEditingIndex(next.length - 1);
  }, [mots, saveMots]);

  const handleCommencer = useCallback(() => {
    Keyboard.dismiss();
    const validMots = mots.filter((m) => m.trim().length > 0);
    if (validMots.length === 0) {
      Alert.alert(
        "Aucun mot",
        "Ajoute au moins un mot avant de commencer la dictée.",
      );
      return;
    }
    saveMots(validMots);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push("/dictee");
  }, [mots, saveMots, router]);

  const styles = makeStyles(colors, insets);
  const isWeb = Platform.OS === "web";

  if (!loaded) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {mots.filter(m => m.trim().length > 0).length} mot
          {mots.filter(m => m.trim().length > 0).length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={mots}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.listContent}
        scrollEnabled={!!mots.length}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="list" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>Aucun mot pour l'instant</Text>
            <Text style={styles.emptySubtitle}>
              Appuie sur "+" pour ajouter des mots manuellement
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.motRow}>
            <View style={styles.motIndexBadge}>
              <Text style={styles.motIndex}>{index + 1}</Text>
            </View>
            <TextInput
              style={[
                styles.motInput,
                editingIndex === index && styles.motInputFocused,
              ]}
              value={item}
              onChangeText={(text) => updateMot(index, text)}
              onFocus={() => setEditingIndex(index)}
              onBlur={() => {
                if (editingIndex === index) setEditingIndex(null);
              }}
              placeholder="Écris un mot..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => setEditingIndex(null)}
            />
            <Pressable
              onPress={() => deleteMot(index)}
              style={styles.deleteButton}
              hitSlop={8}
            >
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </Pressable>
          </View>
        )}
      />

      <View
        style={[
          styles.footer,
          { paddingBottom: isWeb ? 34 : insets.bottom + 16 },
        ]}
      >
        <Pressable
          onPress={addMot}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.pressed,
          ]}
        >
          <Feather name="plus" size={22} color={colors.secondary} />
          <Text style={styles.addButtonText}>Ajouter un mot</Text>
        </Pressable>

        <Pressable
          onPress={handleCommencer}
          style={({ pressed }) => [
            styles.commencerButton,
            pressed && styles.pressed,
          ]}
          testID="commencer-button"
        >
          <Feather name="play" size={22} color={colors.primaryForeground} />
          <Text style={styles.commencerText}>Commencer la dictée</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingText: {
      fontFamily: "Geist_400Regular",
      fontSize: 16,
      color: colors.mutedForeground,
    },
    countBadge: {
      alignSelf: "flex-end",
      backgroundColor: colors.accent,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginRight: 20,
      marginTop: 12,
      marginBottom: 4,
    },
    countText: {
      fontFamily: "Geist_700Bold",
      fontSize: 14,
      color: colors.accentForeground,
    },
    listContent: {
      padding: 16,
      gap: 10,
      flexGrow: 1,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: "Geist_700Bold",
      fontSize: 20,
      color: colors.foreground,
      textAlign: "center",
    },
    emptySubtitle: {
      fontFamily: "Geist_400Regular",
      fontSize: 15,
      color: colors.mutedForeground,
      textAlign: "center",
      paddingHorizontal: 24,
    },
    motRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    motIndexBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    motIndex: {
      fontFamily: "Geist_700Bold",
      fontSize: 14,
      color: colors.mutedForeground,
    },
    motInput: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: "Geist_700Bold",
      fontSize: 18,
      color: colors.foreground,
      borderWidth: 2,
      borderColor: colors.border,
    },
    motInputFocused: {
      borderColor: colors.primary,
    },
    deleteButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    footer: {
      padding: 16,
      paddingTop: 8,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 14,
      borderWidth: 2,
      borderColor: colors.secondary,
    },
    addButtonText: {
      fontFamily: "Geist_700Bold",
      fontSize: 16,
      color: colors.secondary,
    },
    commencerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      padding: 18,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    commencerText: {
      fontFamily: "Geist_800ExtraBold",
      fontSize: 18,
      color: colors.primaryForeground,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
  });
}
