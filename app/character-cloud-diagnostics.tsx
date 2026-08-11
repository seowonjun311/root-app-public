import {
  Link,
  Stack,
} from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getCharacterCloudDiagnosticsSnapshot,
  retryCharacterCloudSyncNow,
  type CharacterCloudDiagnosticsSnapshot,
  type CharacterCloudSyncResult,
} from '../store/characterCloudSync';

function timeText(
  value:
    string | null
): string {
  if (
    !value
  ) {
    return '-';
  }

  const date =
    new Date(
      value
    );

  return Number.isNaN(
    date.getTime()
  )
    ? value
    : date.toLocaleString();
}

function boolText(
  value: boolean
): string {
  return value
    ? 'YES'
    : 'NO';
}

// CHARACTER_V98D_CLOUD_DIAGNOSTICS_SCREEN
export default function CharacterCloudDiagnosticsScreen() {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      CharacterCloudDiagnosticsSnapshot | null
    >(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    syncing,
    setSyncing,
  ] =
    useState(
      false
    );

  const [
    lastResult,
    setLastResult,
  ] =
    useState<
      CharacterCloudSyncResult | null
    >(
      null
    );

  const [
    errorText,
    setErrorText,
  ] =
    useState<
      string | null
    >(
      null
    );

  const refresh =
    useCallback(
      async () => {
        setLoading(
          true
        );

        try {
          const next =
            await getCharacterCloudDiagnosticsSnapshot();

          setSnapshot(
            next
          );

          setErrorText(
            null
          );
        }
        catch (error: any) {
          setErrorText(
            error
              ?.message ??
            String(
              error
            )
          );
        }
        finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(
    () => {
      void refresh();
    },
    [
      refresh,
    ]
  );

  const manualSync =
    useCallback(
      async () => {
        setSyncing(
          true
        );

        try {
          const result =
            await retryCharacterCloudSyncNow();

          setLastResult(
            result
          );

          setErrorText(
            null
          );
        }
        catch (error: any) {
          setErrorText(
            error
              ?.message ??
            String(
              error
            )
          );
        }
        finally {
          setSyncing(
            false
          );

          await refresh();
        }
      },
      [
        refresh,
      ]
    );

  return (
    <SafeAreaView
      style={
        styles.safe
      }
    >
      <Stack.Screen
        options={{
          title:
            '\uCE90\uB9AD\uD130 \uD074\uB77C\uC6B0\uB4DC',
        }}
      />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <View
          style={
            styles.hero
          }
        >
          <Text
            style={
              styles.title
            }
          >
            {'\uCE90\uB9AD\uD130 \uD074\uB77C\uC6B0\uB4DC \uC9C4\uB2E8'}
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            {'V98 \uACC4\uC815 \uBD84\uB9AC\u00B7Firebase \uB3D9\uAE30\uD654 \uC0C1\uD0DC\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.'}
          </Text>
        </View>

        <View
          style={
            styles.actions
          }
        >
          <Pressable
            style={
              styles.actionButton
            }
            disabled={
              loading
            }
            onPress={
              () => {
                void refresh();
              }
            }
          >
            <Text
              style={
                styles.actionText
              }
            >
              {
                loading
                  ? '\uC0C8\uB85C\uACE0\uCE68 \uC911...'
                  : '\uC0C8\uB85C\uACE0\uCE68'
              }
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              styles.primaryButton,
            ]}
            disabled={
              syncing
            }
            onPress={
              () => {
                void manualSync();
              }
            }
          >
            <Text
              style={[
                styles.actionText,
                styles.primaryText,
              ]}
            >
              {
                syncing
                  ? '\uB3D9\uAE30\uD654 \uC911...'
                  : '\uC9C0\uAE08 \uB3D9\uAE30\uD654'
              }
            </Text>
          </Pressable>
        </View>

        {
          errorText
            ? (
                <View
                  style={
                    styles.errorCard
                  }
                >
                  <Text
                    style={
                      styles.errorTitle
                    }
                  >
                    {'\uB3D9\uAE30\uD654/\uC9C4\uB2E8 \uC624\uB958'}
                  </Text>

                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {
                      errorText
                    }
                  </Text>
                </View>
              )
            : null
        }

        {
          lastResult
            ? (
                <View
                  style={
                    styles.resultCard
                  }
                >
                  <Text
                    style={
                      styles.resultText
                    }
                  >
                    {
                      '\uB9C8\uC9C0\uB9C9 \uC218\uB3D9 \uB3D9\uAE30\uD654: ' +
                      lastResult
                    }
                  </Text>
                </View>
              )
            : null
        }

        {
          snapshot
            ? (
                <>
                  <View
                    style={
                      styles.card
                    }
                  >
                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {'\uACC4\uC815 Scope'}
                    </Text>

                    <Text
                      style={
                        styles.value
                      }
                    >
                      {
                        snapshot.scope
                          .scopeId
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'kind: ' +
                        snapshot.scope
                          .kind
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'cloudUid: ' +
                        (
                          snapshot.scope
                            .cloudUid ??
                          '-'
                        )
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'guestId: ' +
                        (
                          snapshot.scope
                            .guestId ??
                          '-'
                        )
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.card
                    }
                  >
                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {'\uB85C\uCEEC \uC0C1\uD0DC'}
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'localHasData: ' +
                        boolText(
                          snapshot.localHasData
                        )
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'localFieldCount: ' +
                        snapshot.localFieldCount
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'dirty: ' +
                        boolText(
                          snapshot.dirty
                        )
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'lastLocalMutationAt: ' +
                        timeText(
                          snapshot.lastLocalMutationAt
                        )
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.card
                    }
                  >
                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {'Firebase \uD074\uB77C\uC6B0\uB4DC'}
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'cloudExists: ' +
                        boolText(
                          snapshot.cloudExists
                        )
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'cloudUpdatedAt: ' +
                        timeText(
                          snapshot.cloudUpdatedAt
                        )
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'lastCloudUpdatedAt: ' +
                        timeText(
                          snapshot.lastCloudUpdatedAt
                        )
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'lastSyncAt: ' +
                        timeText(
                          snapshot.lastSyncAt
                        )
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'cloudOwnerUid: ' +
                        (
                          snapshot.cloudOwnerUid ??
                          '-'
                        )
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'cloudScopeId: ' +
                        (
                          snapshot.cloudScopeId ??
                          '-'
                        )
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.card
                    }
                  >
                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {'Queue / Retry'}
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'syncInFlight: ' +
                        boolText(
                          snapshot.syncInFlight
                        )
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'retryScheduled: ' +
                        boolText(
                          snapshot.retryScheduled
                        )
                      }
                    </Text>

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {
                        'retryAttempt: ' +
                        snapshot.retryAttempt
                      }
                    </Text>
                  </View>
                </>
              )
            : null
        }

        <View
          style={
            styles.note
          }
        >
          <Text
            style={
              styles.noteTitle
            }
          >
            {'\uC815\uC0C1 \uAE30\uC900'}
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {'\uB85C\uADF8\uC778 \uACC4\uC815\uC740 scopeId\uAC00 uid_... \uD615\uD0DC\uC774\uACE0 cloudExists=YES, \uC548\uC815\uD654 \uD6C4 dirty=NO\uAC00 \uC815\uC0C1\uC785\uB2C8\uB2E4.'}
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {'\uAC8C\uC2A4\uD2B8\uB294 guest_... scope\uC774\uBA70 Firebase \uCE90\uB9AD\uD130 cloud\uB97C \uC4F0\uC9C0 \uC54A\uB294 \uAC83\uC774 \uC815\uC0C1\uC785\uB2C8\uB2E4.'}
          </Text>
        </View>

        <Link
          href={
            '/character-preview' as never
          }
          asChild
        >
          <Pressable
            style={
              styles.backButton
            }
          >
            <Text
              style={
                styles.backText
              }
            >
              {'\uCE90\uB9AD\uD130 \uC120\uD0DD\uC73C\uB85C'}
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        '#F6F2EC',
    },
    content: {
      padding: 18,
      paddingBottom: 42,
      gap: 12,
    },
    hero: {
      padding: 18,
      borderRadius: 18,
      backgroundColor:
        '#2F2B26',
      gap: 7,
    },
    title: {
      fontSize: 21,
      fontWeight: '900',
      color:
        '#FFFFFF',
    },
    subtitle: {
      fontSize: 12,
      lineHeight: 18,
      color:
        '#E8E0D6',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#D7CEC4',
    },
    primaryButton: {
      backgroundColor:
        '#2F2B26',
      borderColor:
        '#2F2B26',
    },
    actionText: {
      fontSize: 12,
      fontWeight: '900',
      color:
        '#4D463F',
    },
    primaryText: {
      color:
        '#FFFFFF',
    },
    card: {
      padding: 15,
      borderRadius: 15,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#E0D7CD',
      gap: 5,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '900',
      color:
        '#3D3833',
    },
    value: {
      fontSize: 13,
      fontWeight: '800',
      color:
        '#5E554D',
    },
    detail: {
      fontSize: 11,
      lineHeight: 17,
      color:
        '#6C635A',
    },
    resultCard: {
      padding: 12,
      borderRadius: 12,
      backgroundColor:
        '#E6F0E3',
    },
    resultText: {
      fontSize: 12,
      fontWeight: '800',
      color:
        '#4B5A46',
    },
    errorCard: {
      padding: 12,
      borderRadius: 12,
      backgroundColor:
        '#F7E5E1',
    },
    errorTitle: {
      fontSize: 12,
      fontWeight: '900',
      color:
        '#7A4F48',
    },
    errorText: {
      marginTop: 4,
      fontSize: 11,
      color:
        '#7A4F48',
    },
    note: {
      padding: 14,
      borderRadius: 14,
      backgroundColor:
        '#FFF9EC',
      borderWidth: 1,
      borderColor:
        '#E8DCBD',
      gap: 4,
    },
    noteTitle: {
      fontSize: 13,
      fontWeight: '900',
      color:
        '#4F4840',
    },
    noteText: {
      fontSize: 11,
      lineHeight: 17,
      color:
        '#6C635A',
    },
    backButton: {
      alignItems: 'center',
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor:
        '#EEE6D9',
    },
    backText: {
      fontSize: 12,
      fontWeight: '900',
      color:
        '#554E47',
    },
  });
