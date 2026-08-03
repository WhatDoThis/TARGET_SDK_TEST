/**
 * app.04_ui.AppScreen (4단계 · 오퍼 렌더)
 * ======================================
 * testNum 선택 · Fetch · 상태 · 오퍼 카드 · event-popup 모달 · 응답 Raw.
 *
 * [Main Functions]
 * ===========
 * - 1. AppScreen — KPI UI 렌더
 *
 * [Dependencies]
 * =========
 * - react / react-native
 * - 03_target/app_target_types
 * - shared/app_shared_utils
 */

import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type {
  EventPopupOffer,
  ParsedOffer,
  TestNum,
} from "../03_target/app_target_types";
import { prettyJson } from "../shared/app_shared_utils";

const TEST_NUM_OPTIONS: TestNum[] = ["1", "2", "3"];

export interface AppScreenProps {
  decisionScope: string;
  status: string;
  statusKind: "ok" | "err" | "info";
  busy: boolean;
  testNum: TestNum;
  onTestNumChange: (value: TestNum) => void;
  offers: ParsedOffer[];
  debugPayload: unknown;
  eventPopup: EventPopupOffer | null;
  onClosePopup: () => void;
  onFetch: () => void;
}

// 1.
export function AppScreen(props: AppScreenProps): React.JSX.Element {
  const {
    decisionScope,
    status,
    statusKind,
    busy,
    testNum,
    onTestNumChange,
    offers,
    debugPayload,
    eventPopup,
    onClosePopup,
    onFetch,
  } = props;

  return (
    <>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>AEP Mobile SDK · Target Test</Text>
        <Text style={styles.sub}>
          scope: {decisionScope} · Edge + Optimize
        </Text>

        <Text style={styles.fieldLabel}>testNum</Text>
        <View style={styles.row}>
          {TEST_NUM_OPTIONS.map((value) => {
            const selected = value === testNum;
            return (
              <Pressable
                key={value}
                style={[
                  styles.chip,
                  selected && styles.chipSelected,
                  busy && styles.buttonDisabled,
                ]}
                disabled={busy}
                onPress={() => onTestNumChange(value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={onFetch}
        >
          <Text style={styles.buttonText}>Fetch offers (Optimize)</Text>
        </Pressable>

        {busy ? <ActivityIndicator color="#2f6fed" style={styles.spinner} /> : null}

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
              No offers yet. Tap Fetch after Target activity is Live.
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

        <Text style={styles.label}>Raw response</Text>
        <Text style={styles.debug}>{prettyJson(debugPayload)}</Text>
      </ScrollView>

      {/* type===event-popup 오퍼만 모달로 표시 */}
      <Modal
        visible={eventPopup != null}
        transparent
        animationType="fade"
        onRequestClose={onClosePopup}
      >
        <View style={styles.popupBackdrop}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>
              {eventPopup?.title || "이벤트 대상"}
            </Text>
            <Text style={styles.popupBody}>
              {eventPopup?.body || "축하합니다!"}
            </Text>
            <Pressable style={styles.popupButton} onPress={onClosePopup}>
              <Text style={styles.popupButtonText}>
                {eventPopup?.buttonText || "확인"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
  fieldLabel: {
    color: "#9aa8bc",
    fontSize: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  chip: {
    minWidth: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2c3a4f",
    backgroundColor: "#1a2332",
    alignItems: "center",
  },
  chipSelected: {
    backgroundColor: "#2f6fed",
    borderColor: "#2f6fed",
  },
  chipText: {
    color: "#e7ecf3",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#fff",
  },
  button: {
    backgroundColor: "#2f6fed",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  spinner: {
    marginVertical: 8,
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
  popupBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  popupCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 12,
  },
  popupBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#444",
    textAlign: "center",
    marginBottom: 20,
  },
  popupButton: {
    backgroundColor: "#4a90d9",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  popupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
