import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useExtractWordsMutation } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const MOTS_SESSION_KEY = "@current_mots_session";
const MOTS_HISTORY_KEY = "@dictee_history";

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const { mutateAsync: extractWords, isPending } = useExtractWordsMutation();

  const pickImage = useCallback(
    async (fromCamera: boolean) => {
      try {
        let result: ImagePicker.ImagePickerResult;
        if (fromCamera) {
          const { status } =
            await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Permission refusée",
              "L'accès à la caméra est nécessaire pour scanner ta feuille.",
            );
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            base64: true,
            quality: 0.8,
            allowsEditing: true,
          });
        } else {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Permission refusée",
              "L'accès à la galerie est nécessaire.",
            );
            return;
          }
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            base64: true,
            quality: 0.8,
          });
        }

        if (!result.canceled && result.assets?.[0]) {
          const asset = result.assets[0];
          setImageUri(asset.uri);
          setImageBase64(asset.base64 ?? null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        Alert.alert("Erreur", "Impossible d'accéder à la caméra.");
      }
    },
    [],
  );

  const handleAnalyse = useCallback(async () => {
    if (!imageBase64) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await extractWords({
        image: imageBase64,
        mimeType: "image/jpeg",
      });

      if (!result.mots || result.mots.length === 0) {
        Alert.alert(
          "Aucun mot trouvé",
          "Essaie de prendre la photo de plus près, avec une bonne lumière.",
        );
        return;
      }

      await AsyncStorage.setItem(
        MOTS_SESSION_KEY,
        JSON.stringify(result.mots),
      );

      const historyRaw = await AsyncStorage.getItem(MOTS_HISTORY_KEY);
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      const now = new Date();
      const dateStr = now.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      });
      history.unshift({
        id: String(Date.now()),
        date: dateStr,
        mots: result.mots,
      });
      await AsyncStorage.setItem(
        MOTS_HISTORY_KEY,
        JSON.stringify(history.slice(0, 10)),
      );

      router.push("/mots");
    } catch {
      Alert.alert(
        "Erreur d'analyse",
        "Impossible d'analyser l'image. Vérifie ta connexion internet et réessaie.",
      );
    }
  }, [imageBase64, extractWords, router]);

  const styles = makeStyles(colors, insets);
  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.container}>
      {imageUri ? (
        <View style={styles.previewSection}>
          <Image
            source={{ uri: imageUri }}
            style={styles.preview}
            resizeMode="contain"
          />
          <Pressable
            onPress={() => {
              setImageUri(null);
              setImageBase64(null);
            }}
            style={styles.clearButton}
          >
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.emptyPreview}>
          <Feather name="image" size={56} color={colors.border} />
          <Text style={styles.emptyText}>
            Prends une photo de ta feuille de mots
          </Text>
        </View>
      )}

      <View style={styles.actionsSection}>
        {imageUri && imageBase64 ? (
          <Pressable
            onPress={handleAnalyse}
            disabled={isPending}
            style={({ pressed }) => [
              styles.analyseButton,
              pressed && styles.pressed,
              isPending && styles.disabled,
            ]}
          >
            {isPending ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primaryForeground} size="small" />
                <Text style={styles.analyseButtonText}>
                  Analyse en cours...
                </Text>
              </View>
            ) : (
              <View style={styles.buttonRow}>
                <Feather
                  name="search"
                  size={22}
                  color={colors.primaryForeground}
                />
                <Text style={styles.analyseButtonText}>
                  Analyser les mots
                </Text>
              </View>
            )}
          </Pressable>
        ) : (
          <>
            {!isWeb && (
              <Pressable
                onPress={() => pickImage(true)}
                style={({ pressed }) => [
                  styles.cameraButton,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.buttonRow}>
                  <Feather
                    name="camera"
                    size={24}
                    color={colors.primaryForeground}
                  />
                  <Text style={styles.cameraButtonText}>
                    Prendre une photo
                  </Text>
                </View>
              </Pressable>
            )}
            <Pressable
              onPress={() => pickImage(false)}
              style={({ pressed }) => [
                styles.galleryButton,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.buttonRow}>
                <Feather name="image" size={24} color={colors.secondary} />
                <Text style={styles.galleryButtonText}>
                  Choisir dans la galerie
                </Text>
              </View>
            </Pressable>
          </>
        )}

        {imageUri && (
          <Pressable
            onPress={() => pickImage(!isWeb)}
            style={({ pressed }) => [
              styles.retakeButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.retakeText}>Reprendre une photo</Text>
          </Pressable>
        )}
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
    previewSection: {
      flex: 1,
      margin: 20,
      borderRadius: colors.radius,
      overflow: "hidden",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    preview: {
      flex: 1,
    },
    clearButton: {
      position: "absolute",
      top: 12,
      right: 12,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 20,
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyPreview: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 40,
    },
    emptyText: {
      fontFamily: "Nunito_400Regular",
      fontSize: 18,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 26,
    },
    actionsSection: {
      padding: 20,
      paddingBottom: insets.bottom + 20,
      gap: 12,
    },
    buttonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    analyseButton: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      padding: 18,
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    analyseButtonText: {
      fontFamily: "Nunito_800ExtraBold",
      fontSize: 18,
      color: colors.primaryForeground,
    },
    cameraButton: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      padding: 18,
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    cameraButtonText: {
      fontFamily: "Nunito_800ExtraBold",
      fontSize: 18,
      color: colors.primaryForeground,
    },
    galleryButton: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 18,
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.secondary,
    },
    galleryButtonText: {
      fontFamily: "Nunito_700Bold",
      fontSize: 18,
      color: colors.secondary,
    },
    retakeButton: {
      alignItems: "center",
      padding: 12,
    },
    retakeText: {
      fontFamily: "Nunito_400Regular",
      fontSize: 15,
      color: colors.mutedForeground,
      textDecorationLine: "underline",
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    disabled: {
      opacity: 0.7,
    },
  });
}
