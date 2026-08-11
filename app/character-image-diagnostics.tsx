import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import {
  Stack,
} from 'expo-router';

import {
  getCharacterFrames,
  type CharacterId,
} from '../constants/characterAssets';

type StandardCharacterId =
  Exclude<CharacterId, 'rooty'>;

const CHARACTER_IDS:
  readonly CharacterId[] = [
  'rooty',
  'moru',
  'mongsil',
  'dami',
  'pio',
];

const LABEL:
  Record<CharacterId, string> = {
  rooty: '\uB8E8\uD2F0',
  moru: '\uBAA8\uB8E8',
  mongsil: '\uBABD\uC2E4',
  dami: '\uB2E4\uBBF8',  // CHARACTER_V90B_PIO_IMAGE_DIAGNOSTICS
  pio: '\uD53C\uC624',

};

const DIRECT_STANDARD_SOURCE:
  Record<
    StandardCharacterId,
    ImageSourcePropType
  > = {
  moru:
    require('../characters/moru/moru_idle_01.png'),
  mongsil:
    require('../characters/mongsil/mongsil_idle_01.png'),
  dami:
    require('../characters/dami/dami_idle_01.png'),  pio:
    require('../characters/pio/pio_idle_01.png'),

};

type AssetProbeProps = {
  title: string;
  source: ImageSourcePropType;
};

function AssetProbe({
  title,
  source,
}: AssetProbeProps) {
  const [
    loadStatus,
    setLoadStatus,
  ] =
    useState('WAITING');

  const [
    sizeStatus,
    setSizeStatus,
  ] =
    useState('WAITING');

  const resolved =
    useMemo(
      () =>
        Image.resolveAssetSource(
          source
        ),
      [source]
    );

  useEffect(
    () => {
      setLoadStatus(
        'WAITING'
      );
      setSizeStatus(
        'WAITING'
      );

      const uri =
        resolved?.uri;

      if (!uri) {
        setSizeStatus(
          'NO RESOLVED URI'
        );
        return;
      }

      Image.getSize(
        uri,
        (
          width,
          height
        ) => {
          setSizeStatus(
            `OK ${width}x${height}`
          );
        },
        (
          error
        ) => {
          setSizeStatus(
            `ERROR ${String(error)}`
          );
        }
      );
    },
    [
      resolved?.uri,
    ]
  );

  return (
    <View
      style={
        styles.probe
      }
    >
      <Text
        style={
          styles.probeTitle
        }
      >
        {title}
      </Text>

      <View
        style={
          styles.imageBox
        }
      >
        <Image
          source={
            source
          }
          resizeMode="contain"
          style={
            styles.image
          }
          onLoadStart={
            () => {
              setLoadStatus(
                'LOAD START'
              );
            }
          }
          onLoad={
            () => {
              setLoadStatus(
                'LOADED'
              );
            }
          }
          onError={
            (
              event
            ) => {
              setLoadStatus(
                `ERROR ${event.nativeEvent.error}`
              );
            }
          }
        />
      </View>

      <Text
        selectable
        style={
          styles.line
        }
      >
        source typeof: {
          typeof source
        }
      </Text>

      <Text
        selectable
        style={
          styles.line
        }
      >
        resolve: {
          resolved
            ? 'YES'
            : 'NO'
        }
      </Text>

      <Text
        selectable
        style={
          styles.line
        }
      >
        resolved size: {
          resolved
            ? `${resolved.width ?? '?'}x${resolved.height ?? '?'} @${resolved.scale ?? '?'}`
            : '-'
        }
      </Text>

      <Text
        selectable
        style={[
          styles.line,
          loadStatus.startsWith(
            'ERROR'
          ) &&
            styles.error,
        ]}
      >
        onLoad: {
          loadStatus
        }
      </Text>

      <Text
        selectable
        style={[
          styles.line,
          sizeStatus.startsWith(
            'ERROR'
          ) &&
            styles.error,
        ]}
      >
        getSize: {
          sizeStatus
        }
      </Text>

      <Text
        selectable
        style={
          styles.uri
        }
      >
        uri: {
          resolved?.uri ??
          '(none)'
        }
      </Text>
    </View>
  );
}

// CHARACTER_V83_STANDARD_IMAGE_LOAD_DIAGNOSTICS
export default function CharacterImageDiagnosticsScreen() {
  const [
    characterId,
    setCharacterId,
  ] =
    useState<CharacterId>(
      'moru'
    );

  const registrySource =
    getCharacterFrames(
      characterId,
      'idle'
    )[0];

  const directSource =
    characterId ===
      'rooty'
      ? registrySource
      : DIRECT_STANDARD_SOURCE[
          characterId
        ];

  return (
    <>
      <Stack.Screen
        options={{
          title:
            '\uCE90\uB9AD\uD130 \uC774\uBBF8\uC9C0 \uC9C4\uB2E8',
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
            Character V83
          </Text>

          <Text
            style={
              styles.description
            }
          >
            {
              '\uB808\uC9C0\uC2A4\uD2B8\uB9AC \uC18C\uC2A4\uC640 PNG \uC9C1\uC811 require \uC18C\uC2A4\uB97C \uAC19\uC740 \uAE30\uAE30\uC5D0\uC11C \uBE44\uAD50\uD569\uB2C8\uB2E4.'
            }
          </Text>

          <View
            style={
              styles.row
            }
          >
            {
              CHARACTER_IDS.map(
                (
                  id
                ) => (
                  <Pressable
                    key={
                      id
                    }
                    onPress={
                      () => {
                        setCharacterId(
                          id
                        );
                      }
                    }
                    style={[
                      styles.button,
                      characterId ===
                        id &&
                        styles.buttonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        characterId ===
                          id &&
                          styles.buttonTextSelected,
                      ]}
                    >
                      {
                        LABEL[
                          id
                        ]
                      }
                    </Text>
                  </Pressable>
                )
              )
            }
          </View>

          {
            registrySource ? (
              <>
                <AssetProbe
                  key={
                    `registry-${characterId}`
                  }
                  title={
                    'A. Registry source'
                  }
                  source={
                    registrySource
                  }
                />

                <AssetProbe
                  key={
                    `direct-${characterId}`
                  }
                  title={
                    characterId ===
                      'rooty'
                      ? 'B. Same Rooty source'
                      : 'B. Direct PNG require'
                  }
                  source={
                    directSource
                  }
                />
              </>
            ) : (
              <Text
                style={
                  styles.error
                }
              >
                NO FRAME SOURCE
              </Text>
            )
          }

          <View
            style={
              styles.help
            }
          >
            <Text
              style={
                styles.helpText
              }
            >
              {
                'LOADED + \uC774\uBBF8\uC9C0 \uBE48 \uD654\uBA74: PNG \uD53D\uC140/\uC54C\uD30C \uB610\uB294 \uB514\uCF54\uB354 \uACBD\uB85C \uD655\uC778'
              }
            </Text>
            <Text
              style={
                styles.helpText
              }
            >
              {
                'ERROR: \uC544\uB798 error/uri\uB97C \uADF8\uB300\uB85C \uCEA1\uCC98'
              }
            </Text>
            <Text
              style={
                styles.helpText
              }
            >
              {
                '\uB8E8\uD2F0\uB294 LOADED, \uD45C\uC900 \uCE90\uB9AD\uD130\uB294 ERROR\uBA74 PNG \uD30C\uC77C \uC778\uCF54\uB529/\uB514\uCF54\uB529 \uCE21\uC73C\uB85C \uBC94\uC704\uAC00 \uC904\uC5B4\uB4ED\uB2C8\uB2E4.'
              }
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
      backgroundColor:
        '#F6F1E7',
    },
    content: {
      padding: 20,
      paddingBottom: 60,
      gap: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#2E2A25',
    },
    description: {
      fontSize: 15,
      lineHeight: 22,
      color: '#6A625A',
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    button: {
      minWidth: 72,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#D8CCBC',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
    },
    buttonSelected: {
      backgroundColor: '#2E2A25',
      borderColor: '#2E2A25',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#5B524A',
    },
    buttonTextSelected: {
      color: '#FFFFFF',
    },
    probe: {
      borderRadius: 22,
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2D8CA',
      gap: 8,
    },
    probeTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: '#2E2A25',
    },
    imageBox: {
      height: 260,
      borderRadius: 16,
      backgroundColor: '#EEE8DE',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    image: {
      width: 240,
      height: 240,
    },
    line: {
      fontSize: 14,
      lineHeight: 20,
      color: '#4E4740',
    },
    uri: {
      fontSize: 12,
      lineHeight: 17,
      color: '#776E65',
    },
    error: {
      color: '#B42318',
      fontWeight: '700',
    },
    help: {
      borderRadius: 18,
      padding: 14,
      backgroundColor: '#EEE8DE',
      gap: 6,
    },
    helpText: {
      fontSize: 13,
      lineHeight: 19,
      color: '#5B524A',
    },
  });
