import {
  Stack,
} from 'expo-router';
import React, {
  useMemo,
} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  type CharacterId,
} from '../constants/characterAssets';
import {
  getCharacterPersonalityProfile,
} from '../constants/characterPersonality';
import {
  validateCharacterPersonalityRuntime,
  type CharacterPersonalityValidationReport,
  type CharacterPersonalityValidationStatus,
} from '../store/characterPersonalityValidation';
import {
  useCharacterRuntimeStatistics,
} from '../store/characterRuntimeStatistics';

const CHARACTER_LABEL:
  Record<CharacterId, string> = {
  rooty: '\uB8E8\uD2F0',
  moru: '\uBAA8\uB8E8',
  mongsil: '\uBABD\uC2E4',
  dami: '\uB2E4\uBBF8',  // CHARACTER_V90B_PIO_PERSONALITY_VALIDATION_SCREEN
  pio: '\uD53C\uC624',
  // CHARACTER_V91B_NURI_PERSONALITY_VALIDATION_SCREEN
  nuri: '\uB204\uB9AC',
  // CHARACTER_V92B_TORI_PERSONALITY_VALIDATION_SCREEN
  tori: '\uD1A0\uB9AC',

};

function statusText(
  status:
    CharacterPersonalityValidationStatus
): string {
  if (
    status ===
    'PASS'
  ) {
    return 'PASS';
  }

  if (
    status ===
    'CHECK'
  ) {
    return 'CHECK';
  }

  return 'WAIT';
}

function percentPoint(
  value: number
): string {
  const sign =
    value > 0
      ? '+'
      : '';

  return (
    sign +
    (
      value *
      100
    ).toFixed(
      1
    ) +
    'pp'
  );
}

function ReportCard({
  report,
}: {
  report:
    CharacterPersonalityValidationReport;
}) {
  const profile =
    getCharacterPersonalityProfile(
      report.characterId
    );

  return (
    <View
      style={
        styles.card
      }
    >
      <View
        style={
          styles.cardHeader
        }
      >
        <View>
          <Text
            style={
              styles.characterName
            }
          >
            {
              CHARACTER_LABEL[
                report.characterId
              ]
            }
          </Text>

          <Text
            style={
              styles.personality
            }
          >
            {
              profile.id
            }
            {' / confidence: '}
            {
              report.confidence
            }
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            report.overallStatus ===
              'PASS'
              ? styles.passBadge
              : report.overallStatus ===
                  'CHECK'
                ? styles.checkBadge
                : styles.waitBadge,
          ]}
        >
          <Text
            style={
              styles.statusText
            }
          >
            {
              statusText(
                report.overallStatus
              )
            }
          </Text>
        </View>
      </View>

      <Text
        style={
          styles.sampleText
        }
      >
        {'rest '}
        {
          report.restSampleCount
        }
        {' / social '}
        {
          report.socialSampleCount
        }
      </Text>

      {report.personalityDelta ? (
        <View
          style={
            styles.deltaBox
          }
        >
          <Text
            style={
              styles.sectionLabel
            }
          >
            {'personality effect'}
          </Text>

          <Text
            style={
              styles.metric
            }
          >
            look: {
              percentPoint(
                report.personalityDelta
                  .lookAround
              )
            }
          </Text>

          <Text
            style={
              styles.metric
            }
          >
            sit: {
              percentPoint(
                report.personalityDelta
                  .sitRest
              )
            }
          </Text>

          <Text
            style={
              styles.metric
            }
          >
            nap: {
              percentPoint(
                report.personalityDelta
                  .nap
              )
            }
          </Text>
        </View>
      ) : null}

      {report.checks.map(
        (check) => (
          <View
            key={
              check.id
            }
            style={
              styles.checkRow
            }
          >
            <Text
              style={[
                styles.checkStatus,
                check.status ===
                  'PASS'
                  ? styles.passText
                  : check.status ===
                      'CHECK'
                    ? styles.checkText
                    : styles.waitText,
              ]}
            >
              {
                check.status
              }
            </Text>

            <View
              style={
                styles.checkBody
              }
            >
              <Text
                style={
                  styles.checkLabel
                }
              >
                {
                  check.label
                }
              </Text>

              <Text
                style={
                  styles.checkSummary
                }
              >
                {
                  check.summary
                }
              </Text>
            </View>
          </View>
        )
      )}
    </View>
  );
}

// CHARACTER_V79_PERSONALITY_VALIDATION_SCREEN
export default function CharacterPersonalityValidationScreen() {
  const rooty =
    useCharacterRuntimeStatistics(
      'rooty'
    );

  const moru =
    useCharacterRuntimeStatistics(
      'moru'
    );

  const mongsil =
    useCharacterRuntimeStatistics(
      'mongsil'
    );

  const dami =
    useCharacterRuntimeStatistics(
      'dami'
    );

  const pio =
    useCharacterRuntimeStatistics(
      'pio'
    );

  const nuri =
    useCharacterRuntimeStatistics(
      'nuri'
    );

  const tori =
    useCharacterRuntimeStatistics(
      'tori'
    );

  const reports =
    useMemo(
      () => [
        validateCharacterPersonalityRuntime(
          'rooty',
          rooty.statistics
        ),
        validateCharacterPersonalityRuntime(
          'moru',
          moru.statistics
        ),
        validateCharacterPersonalityRuntime(
          'mongsil',
          mongsil.statistics
        ),
        validateCharacterPersonalityRuntime(
          'dami',
          dami.statistics
        ),
        validateCharacterPersonalityRuntime(
          'pio',
          pio.statistics
        ),
        validateCharacterPersonalityRuntime(
          'nuri',
          nuri.statistics
        ),
        validateCharacterPersonalityRuntime(
          'tori',
          tori.statistics
        ),
      ],
      [
        rooty.statistics,
        moru.statistics,
        mongsil.statistics,
        dami.statistics,
        pio.statistics,
        nuri.statistics,
        tori.statistics,
      ]
    );

  const ready =
    rooty.ready &&
    moru.ready &&
    mongsil.ready &&
    dami.ready &&
    pio.ready &&
    nuri.ready &&
    tori.ready;

  const passCount =
    reports.filter(
      (report) =>
        report.overallStatus ===
        'PASS'
    ).length;

  const checkCount =
    reports.filter(
      (report) =>
        report.overallStatus ===
        'CHECK'
    ).length;

  const waitCount =
    reports.length -
    passCount -
    checkCount;

  return (
    <>
      <Stack.Screen
        options={{
          title:
            '\uC131\uACA9 \uC790\uB3D9 \uAC80\uC99D',
        }}
      />

      <SafeAreaView
        style={
          styles.screen
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
        >
          <Text
            style={
              styles.title
            }
          >
            Character V79
          </Text>

          <Text
            style={
              styles.description
            }
          >
            {'V78 \uB204\uC801 \uD1B5\uACC4\uB97C \uC774\uC6A9\uD574 personality\uAC00 \uC2E4\uC81C \uB7F0\uD0C0\uC784\uC5D0\uC11C \uC758\uB3C4\uD55C \uBC29\uD5A5\uC73C\uB85C \uC791\uB3D9\uD558\uB294\uC9C0 \uC790\uB3D9 \uD310\uC815\uD569\uB2C8\uB2E4.'}
          </Text>

          <View
            style={
              styles.summary
            }
          >
            <Text
              style={
                styles.summaryTitle
              }
            >
              {'\uC804\uCCB4 \uD310\uC815'}
            </Text>

            <Text
              style={
                styles.summaryMetric
              }
            >
              PASS: {
                passCount
              }
            </Text>

            <Text
              style={
                styles.summaryMetric
              }
            >
              CHECK: {
                checkCount
              }
            </Text>

            <Text
              style={
                styles.summaryMetric
              }
            >
              WAIT: {
                waitCount
              }
            </Text>

            <Text
              style={
                styles.small
              }
            >
              {
                ready
                  ? '\uB204\uC801 \uB85C\uB4DC \uC644\uB8CC'
                  : '\uB204\uC801 \uB85C\uB4DC \uC911...'
              }
            </Text>
          </View>

          <View
            style={
              styles.guide
            }
          >
            <Text
              style={
                styles.guideText
              }
            >
              {'PASS = \uC131\uACA9 \uD6A8\uACFC\uC640 \uC2E4\uC81C \uD589\uB3D9 \uC120\uD0DD\uC774 \uD604\uC7AC \uD45C\uBCF8\uC5D0\uC11C \uC815\uC0C1 \uBC94\uC704'}
            </Text>

            <Text
              style={
                styles.guideText
              }
            >
              {'CHECK = \uD45C\uBCF8\uC740 \uC788\uC9C0\uB9CC \uAE30\uB300 \uBC29\uD5A5\uACFC \uD070 \uCC28\uC774\uAC00 \uC788\uC5B4 \uD655\uC778 \uD544\uC694'}
            </Text>

            <Text
              style={
                styles.guideText
              }
            >
              {'WAIT = \uD310\uC815\uD558\uAE30\uC5D0 \uD45C\uBCF8\uC774 \uBD80\uC871'}
            </Text>

            <Text
              style={
                styles.guideText
              }
            >
              {'social WAIT\uB294 rest \uC885\uD569 PASS\uB97C \uB9C9\uC9C0 \uC54A\uC9C0\uB9CC, \uCDA9\uBD84\uD55C social \uD45C\uBCF8\uC5D0\uC11C CHECK\uAC00 \uB098\uC624\uBA74 \uC885\uD569 CHECK\uB85C \uD45C\uC2DC\uB429\uB2C8\uB2E4.'}
            </Text>
          </View>

          {reports.map(
            (report) => (
              <ReportCard
                key={
                  report.characterId
                }
                report={
                  report
                }
              />
            )
          )}

          <View
            style={
              styles.note
            }
          >
            <Text
              style={
                styles.noteText
              }
            >
              {'rest personality \uAC80\uC99D\uC740 V75 \uC801\uC6A9 \uD6C4 \uD655\uB960\uC5D0\uC11C multiplier\uB97C \uC5ED\uC0B0\uD574 \uC801\uC6A9 \uC804 \uBD84\uD3EC\uB97C \uBCF5\uC6D0\uD55C \uB4A4, \uC2E4\uC81C \uBCC0\uD654 \uBC29\uD5A5\uC744 \uAC80\uC99D\uD569\uB2C8\uB2E4.'}
            </Text>

            <Text
              style={
                styles.noteText
              }
            >
              {'\uC2E4\uC81C rest \uC120\uD0DD\uC740 V66 \uCD5C\uC885 \uD655\uB960 \uD3C9\uADE0\uACFC \uB204\uC801 \uC120\uD0DD \uBE44\uC728\uC758 \uCD5C\uB300 \uC624\uCC28\uB97C \uD45C\uBCF8 \uD06C\uAE30\uC5D0 \uB530\uB77C \uD310\uC815\uD569\uB2C8\uB2E4.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F6F1E8',
    },
    content: {
      padding: 20,
      paddingBottom: 48,
      gap: 14,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: '#2F2B26',
    },
    description: {
      fontSize: 13,
      lineHeight: 19,
      color: '#6E665D',
    },
    summary: {
      padding: 16,
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      gap: 5,
    },
    summaryTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#2F2B26',
    },
    summaryMetric: {
      fontSize: 14,
      fontWeight: '800',
      color: '#4F473F',
    },
    small: {
      fontSize: 11,
      color: '#877D72',
    },
    guide: {
      padding: 14,
      borderRadius: 16,
      backgroundColor: '#EEE6D9',
      gap: 5,
    },
    guideText: {
      fontSize: 12,
      lineHeight: 18,
      color: '#645D55',
    },
    card: {
      padding: 16,
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      gap: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    characterName: {
      fontSize: 19,
      fontWeight: '800',
      color: '#2F2B26',
    },
    personality: {
      marginTop: 2,
      fontSize: 12,
      color: '#766D64',
    },
    statusBadge: {
      minWidth: 62,
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    passBadge: {
      backgroundColor: '#DCEADB',
    },
    checkBadge: {
      backgroundColor: '#F4DFC1',
    },
    waitBadge: {
      backgroundColor: '#E7E3DD',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '900',
      color: '#2F2B26',
    },
    sampleText: {
      fontSize: 12,
      color: '#766D64',
    },
    deltaBox: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: '#F7F4EF',
      gap: 4,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: '#645D55',
    },
    metric: {
      fontSize: 13,
      fontWeight: '700',
      color: '#4F473F',
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#E4DDD4',
    },
    checkStatus: {
      width: 48,
      fontSize: 11,
      fontWeight: '900',
    },
    passText: {
      color: '#497447',
    },
    checkText: {
      color: '#9A641E',
    },
    waitText: {
      color: '#877D72',
    },
    checkBody: {
      flex: 1,
      gap: 2,
    },
    checkLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: '#4F473F',
    },
    checkSummary: {
      fontSize: 11,
      lineHeight: 17,
      color: '#766D64',
    },
    note: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: '#EEE6D9',
      gap: 7,
    },
    noteText: {
      fontSize: 12,
      lineHeight: 18,
      color: '#645D55',
    },
  });
