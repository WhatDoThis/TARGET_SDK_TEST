/**
 * app.ui.AppScreen (App 테스트 화면)
 * =================================
 * 1화면: Fetch offers / ECID / 오퍼·원시 JSON 표시.
 *
 * [Main Functions]
 * ===========
 * - 1. AppScreen — 상태·버튼·결과 렌더
 *
 * [Dependencies]
 * =========
 * - react / react-native
 * - target/app_target_types
 * - shared/app_shared_utils
 */

import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ParsedOffer } from "../target/app_target_types";
import { prettyJson } from "../shared/app_shared_utils";

export interface AppScreenProps {
  decisionScope: string;
  status: string;
  statusKind: "ok" | "err" | "info";
  busy: boolean;
  offers: ParsedOffer[];
  debugPayload: unknown;
  onFetch: () => void;
  onIdentity: () => void;
}

// 1.
export function AppScreen(props: AppScreenProps): React.JSX.Element {
  const {
    decisionScope,
    status,
    statusKind,
    busy,
    offers,
    debugPayload,
    onFetch,
    onIdentity,
  } = props;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>AEP Mobile SDK · Target Test</Text>
      <Text style={styles.sub}>scope: {decisionScope}</Text>

      <View style={styles.row}>
        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={onFetch}
        >
          <Text style={styles.buttonText}>Fetch offers (Optimize)</Text>
        </Pressable>
        <Pressable
          style={[styles.buttonSecondary, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={onIdentity}
        >
          <Text style={styles.buttonSecondaryText}>Get ECID</Text>
        </Pressable>
      </View>

      {busy ? <ActivityIndicator color="#2f6fed" /> : null}

      <View
        style={[
          styles.status,
          statusKind === "ok" && styles.statusOk,
          statusKind === "err" && styles.statusErr,
        ]}
      >
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {offers.length === 0 ? (
        <View style={styles.offer}>
          <Text style={styles.offerBody}>
            No offers yet. Tap Fetch after Tags Dev publish + Target activity.
          </Text>
        </View>
      ) : (
        offers.map((offer, index) => (
          <View key={`${offer.scope}-${index}`} style={styles.offer}>
            <Text style={styles.offerTitle}>
              {String(offer.payload?.title ?? "(no title)")}
            </Text>
            <Text style={styles.offerBody}>
              {String(offer.payload?.body ?? "(no body)")}
            </Text>
            <Text style={styles.meta}>
              scope={offer.scope} · type={String(offer.payload?.type ?? "-")}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.label}>Raw propositions</Text>
      <Text style={styles.debug}>{prettyJson(debugPayload)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 20,
    paddingTop: 56,
    backgroundColor: "#0f1419",
    minHeight: "100%",
  },
  title: {
    color: "#e7ecf3",
    fontSize: 22,
    fontWeight: "650",
    marginBottom: 6,
  },
  sub: {
    color: "#9aa8bc",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#2f6fed",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: "#2c3a4f",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  buttonSecondaryText: {
    color: "#e7ecf3",
  },
  status: {
    borderWidth: 1,
    borderColor: "#2c3a4f",
    backgroundColor: "#1a2332",
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  statusOk: {
    borderColor: "rgba(61,186,122,0.45)",
  },
  statusErr: {
    borderColor: "rgba(227,93,106,0.55)",
  },
  statusText: {
    color: "#e7ecf3",
  },
  offer: {
    borderWidth: 1,
    borderColor: "#2c3a4f",
    backgroundColor: "#1a2332",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  offerTitle: {
    color: "#e7ecf3",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },
  offerBody: {
    color: "#9aa8bc",
    lineHeight: 20,
  },
  meta: {
    marginTop: 8,
    color: "#9aa8bc",
    fontSize: 12,
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    color: "#9aa8bc",
    fontSize: 13,
  },
  debug: {
    color: "#c9d4e3",
    fontFamily: "monospace",
    fontSize: 12,
    backgroundColor: "#0b1017",
    borderWidth: 1,
    borderColor: "#2c3a4f",
    borderRadius: 8,
    padding: 12,
  },
});
