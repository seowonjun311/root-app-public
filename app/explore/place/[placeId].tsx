import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
    router,
    useFocusEffect,
    useLocalSearchParams,
} from 'expo-router';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
    useRootTheme,
} from '../../../store/rootTheme';

import {
    completeExploration,
    completeExplorationTheme,
    loadLocalExplorationData,
} from '../../../store/explorationCloud';

import {
    EXPLORATION_THEME_RULES,
    getExplorationPlace,
    isExplorationThemeComplete,
    type ExplorationPlaceDefinition,
} from '../../../store/explorationCatalog';

type CompleteExplorationInput = {
  placeId: string;

  verifiedAt: string;

  latitude: number;
  longitude: number;

  accuracyMeters: number;
  distanceMeters: number;
};

function getDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadius =
    6371000;

  const toRadians = (
    value: number
  ) =>
    (
      value *
      Math.PI
    ) / 180;

  const deltaLatitude =
    toRadians(
      latitude2 -
        latitude1
    );

  const deltaLongitude =
    toRadians(
      longitude2 -
        longitude1
    );

  const firstLatitude =
    toRadians(
      latitude1
    );

  const secondLatitude =
    toRadians(
      latitude2
    );

  const a =
    Math.sin(
      deltaLatitude / 2
    ) ** 2 +
    Math.cos(
      firstLatitude
    ) *
      Math.cos(
        secondLatitude
      ) *
      Math.sin(
        deltaLongitude / 2
      ) ** 2;

  return (
    2 *
    earthRadius *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(
        1 - a
      )
    )
  );
}

export default function PlaceExploreScreen() {
  const {
    placeId,
  } =
    useLocalSearchParams<{
      placeId?: string;
    }>();

  const {
    theme,
    isCityBlack,
  } =
    useRootTheme();

  const insets =
    useSafeAreaInsets();

  const place =
    useMemo<ExplorationPlaceDefinition | null>(
      () =>
        getExplorationPlace(
          Array.isArray(placeId)
            ? placeId[0]
            : placeId
        ),
      [placeId]
    );

  const [
    isVerifying,
    setIsVerifying,
  ] =
    useState(false);

  const [
    completed,
    setCompleted,
  ] =
    useState(false);

  const [
    resultModal,
    setResultModal,
  ] =
    useState<{
      title: string;
      message: string;
      success?: boolean;
    } | null>(null);

 useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const refresh =
        async () => {
          try {
            const data =
              await loadLocalExplorationData();

            if (
              !mounted ||
              !place
            ) {
              return;
            }

            const isCompleted =
              data
                .visitedPlaceIds
                .includes(
                  place.id
                );

            setCompleted(
              isCompleted
            );

            console.log(
              'EXPLORE PLACE LOCAL DATA APPLIED',
              {
                placeId:
                  place.id,

                districtId:
                  place.districtId,

                completed:
                  isCompleted,

                visitedCount:
                  data
                    .visitedPlaceIds
                    .length,

                points:
                  data.points,
              }
            );
          } catch (
            error
          ) {
            console.log(
              'EXPLORE PLACE LOCAL DATA LOAD ERROR',
              error
            );
          }
        };

      void refresh();

      return () => {
        mounted = false;
      };
    }, [place])
  );

  const saveCompletedRecord =
    async (
      record:
        CompleteExplorationInput
    ) => {
      /*
       * 저장 전 현재 데이터를 확인해서
       * 이미 완료한 장소인지 판단합니다.
       */
      const beforeData =
        await loadLocalExplorationData();

      const alreadyCompleted =
        beforeData
          .visitedPlaceIds
          .includes(
            record.placeId
          );

      /*
       * 방문 기록, 위치, 포인트,
       * 건물, 스탬프, 중복 보상 차단,
       * 로컬 저장과 서버 동기화를
       * 통합 함수로 처리합니다.
       */
      await completeExploration({
        placeId:
          record.placeId,

        verifiedAt:
          record.verifiedAt,

        latitude:
          record.latitude,

        longitude:
          record.longitude,

        accuracyMeters:
          record.accuracyMeters,

        distanceMeters:
          record.distanceMeters,
      });

      /*
       * 장소 완료 후 최신 데이터를
       * 다시 읽습니다.
       */
      let latestData =
        await loadLocalExplorationData();

      /*
       * 장소 완료로 테마 조건까지
       * 충족됐는지 검사합니다.
       */
      for (
        const rule of
        EXPLORATION_THEME_RULES
      ) {
        const themeCompleted =
          isExplorationThemeComplete(
            rule.themeId,
            latestData.visitedPlaceIds
          );

        const themeAlreadyCompleted =
          latestData
            .completedThemeIds
            .includes(
              rule.themeId
            );

        if (
          themeCompleted &&
          !themeAlreadyCompleted
        ) {
          await completeExplorationTheme({
            themeId:
              rule.themeId,

            points:
              rule.points,
          });

          /*
           * 다른 테마도 연속으로
           * 검사할 수 있도록
           * 최신 데이터를 다시 읽습니다.
           */
          latestData =
            await loadLocalExplorationData();
        }
      }

      const completedNow =
        latestData
          .visitedPlaceIds
          .includes(
            record.placeId
          );

      setCompleted(
        completedNow
      );

      console.log(
        'EXPLORE PLACE UNIFIED COMPLETE DONE',
        {
          placeId:
            record.placeId,

          alreadyCompleted,

          completedNow,

          rewarded:
            !alreadyCompleted &&
            completedNow,

          visitedCount:
            latestData
              .visitedPlaceIds
              .length,

          points:
            latestData.points,

          buildingCount:
            latestData
              .unlockedBuildingIds
              .length,

          stampCount:
            latestData
              .unlockedStampIds
              .length,

          completedThemeCount:
            latestData
              .completedThemeIds
              .length,
        }
      );

      /*
       * 기존 완료 메시지에서 사용할
       * 최초 보상 여부를 반환합니다.
       */
      return (
        !alreadyCompleted &&
        completedNow
      );
    };

  const completeForDevelopment =
    async () => {
      if (!place) {
        return;
      }

      const rewarded =
        await saveCompletedRecord({
          placeId:
            place.id,

          verifiedAt:
            new Date().toISOString(),

          latitude: 0,
          longitude: 0,

          accuracyMeters: 0,
          distanceMeters: 0,
        });

      if (!rewarded) {
        setResultModal({
          title:
            '이미 완료한 탐험이에요',

          message:
            '이 장소의 방문 보상은 이미 획득했어요.',

          success: true,
        });

        return;
      }

      setResultModal({
        title:
          `${place.name} 테스트 완료!`,

        message:
          `개발 테스트로 +${place.rewardPoints} 탐험 포인트와 ${place.rewardLabel}을 획득했어요.`,

        success: true,
      });
    };

  const verifyCurrentLocation =
    async () => {
      if (!place) {
        return;
      }

      if (
        completed
      ) {
        setResultModal({
          title:
            '이미 완료한 탐험이에요',
          message:
            '이 장소의 방문 기록이 이미 저장되어 있어요.',
          success: true,
        });

        return;
      }

      if (
        place
          .verificationPoints
          .length === 0
      ) {
        setResultModal({
          title:
            '인증 지점 준비 중',
          message:
            '이 장소의 검증된 위도·경도를 아직 입력하지 않았어요. 다음 단계에서 좌표를 연결하면 GPS 인증이 활성화돼요.',
        });

        return;
      }

      try {
        setIsVerifying(
          true
        );

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (
          permission.status !==
          'granted'
        ) {
          setResultModal({
            title:
              '위치 권한이 필요해요',
            message:
              '설정에서 위치 권한을 허용한 뒤 다시 시도해 주세요.',
          });

          return;
        }

        const location =
          await Location.getCurrentPositionAsync({
            accuracy:
              Location.Accuracy.High,
          });

        const accuracy =
          Number(
            location.coords
              .accuracy ?? 9999
          );

        if (
          accuracy > 100
        ) {
          setResultModal({
            title:
              '현재 위치가 정확하지 않아요',
            message:
              `현재 GPS 오차는 약 ${Math.round(
                accuracy
              )}m예요. 야외에서 잠시 기다린 뒤 다시 시도해 주세요.`,
          });

          return;
        }

        const distances =
          place.verificationPoints.map(
            (
              point
            ) => ({
              point,
              distance:
                getDistanceMeters(
                  location.coords
                    .latitude,
                  location.coords
                    .longitude,
                  point.latitude,
                  point.longitude
                ),
            })
          );

        const nearest =
          distances.sort(
            (
              first,
              second
            ) =>
              first.distance -
              second.distance
          )[0];

        if (!nearest) {
          return;
        }

        const verified =
          nearest.distance <=
          nearest.point
            .radiusMeters;

        if (!verified) {
          setResultModal({
            title:
              '인증 범위 밖이에요',
            message:
              `${place.name} 인증 지점에서 약 ${Math.round(
                nearest.distance
              )}m 떨어져 있어요. 장소 가까이 이동한 뒤 다시 시도해 주세요.`,
          });

          return;
        }

        const rewarded =
          await saveCompletedRecord({
            placeId:
              place.id,

            verifiedAt:
              new Date().toISOString(),

            latitude:
              location.coords
                .latitude,

            longitude:
              location.coords
                .longitude,

            accuracyMeters:
              accuracy,

            distanceMeters:
              nearest.distance,
          });

        setResultModal({
          title:
            `${place.name} 탐험 완료!`,

          message:
            rewarded
              ? `+${place.rewardPoints} 탐험 포인트와 ${place.rewardLabel}을 획득했어요.`
              : '이미 방문 보상을 획득한 장소예요.',

          success: true,
        });
      } catch (error) {
        console.log(
          'EXPLORATION VERIFY ERROR',
          error
        );

        setResultModal({
          title:
            '위치 인증 실패',
          message:
            '현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
        });
      } finally {
        setIsVerifying(
          false
        );
      }
    };

  if (!place) {
    return (
      <View
        style={[
          styles.centerScreen,
          {
            backgroundColor:
              theme.background,
            paddingTop:
              insets.top,
          },
        ]}
      >
        <Text
          style={[
            styles.emptyTitle,
            {
              color:
                theme.text,
            },
          ]}
        >
          장소를 찾지 못했어요
        </Text>

        <Pressable
          onPress={() =>
            router.back()
          }
          style={[
            styles.simpleButton,
            {
              borderColor:
                theme.line,
              borderRadius:
                theme.radius.button,
            },
          ]}
        >
          <Text
            style={{
              color:
                theme.text,
              fontWeight:
                '800',
            }}
          >
            돌아가기
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor:
            theme.background,
          paddingTop:
            insets.top,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            40 +
            insets.bottom,
        }}
      >
        <View
          style={
            styles.header
          }
        >
          <Pressable
            hitSlop={10}
            onPress={() =>
              router.back()
            }
            style={
              styles.backButton
            }
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={
                theme.text
              }
            />
          </Pressable>

          <View
            style={
              styles.headerTextBox
            }
          >
            <Text
              style={[
                styles.headerTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {place.name}
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              서울특별시{' '}
              {place.district}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  completed
                    ? theme.button
                    : theme.card,
                borderColor:
                  completed
                    ? theme.button
                    : theme.line,
                borderRadius:
                  theme.radius.button,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    completed
                      ? theme.buttonText
                      : theme.subText,
                },
              ]}
            >
              {completed
                ? '완료'
                : '미방문'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                theme.radius.card,
            },
          ]}
        >
          <View
            style={[
              styles.placeIconBox,
              {
                backgroundColor:
                  theme.card2,
                borderRadius:
                  theme.radius.button,
              },
            ]}
          >
            <Ionicons
              name="location"
              size={27}
              color={
                theme.button
              }
            />
          </View>

          <Text
            style={[
              styles.placeName,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {place.name}
          </Text>

          <Text
            style={[
              styles.description,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {place.description}
          </Text>

          <View
            style={[
              styles.typeTag,
              {
                borderColor:
                  theme.line,
                borderRadius:
                  theme.radius.button,
              },
            ]}
          >
            <Text
              style={[
                styles.typeTagText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {place.areaType}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                theme.radius.card,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            탐험 보상
          </Text>

          <RewardRow
            icon="wallet-outline"
            label={`+${place.rewardPoints} 탐험 포인트`}
            theme={theme}
          />

          <RewardRow
            icon="business-outline"
            label={place.rewardLabel}
            theme={theme}
          />

          <RewardRow
            icon="ribbon-outline"
            label={`${place.name} 방문 스탬프`}
            theme={theme}
          />
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                theme.radius.card,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            인증 방식
          </Text>

          <View
            style={
              styles.infoRow
            }
          >
            <Ionicons
              name="navigate-outline"
              size={18}
              color={
                theme.button
              }
            />

            <View
              style={
                styles.infoTextBox
              }
            >
              <Text
                style={[
                  styles.infoTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                현재 위치로 GPS 인증
              </Text>

              <Text
                style={[
                  styles.infoDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                장소 근처에서 버튼을 눌러 방문을 인증해요.
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.coordinateNotice,
              {
                color:
                  theme.mutedText,
              },
            ]}
          >
            {place
              .verificationPoints
              .length > 0
              ? `${place.verificationPoints.length}개의 인증 지점이 등록되어 있어요.`
              : '검증된 인증 좌표를 입력하면 GPS 인증이 활성화돼요.'}
          </Text>
        </View>

        <Pressable
          disabled={
            isVerifying
          }
          onPress={
            verifyCurrentLocation
          }
          style={({
            pressed,
          }) => [
            styles.verifyButton,
            {
              backgroundColor:
                completed
                  ? theme.card2
                  : theme.button,
              borderColor:
                completed
                  ? theme.line
                  : theme.button,
              borderRadius:
                isCityBlack
                  ? 4
                  : theme.radius.button,
              opacity:
                pressed ||
                isVerifying
                  ? 0.7
                  : 1,
            },
          ]}
        >
          {isVerifying ? (
            <ActivityIndicator
              size="small"
              color={
                theme.buttonText
              }
            />
          ) : (
            <Ionicons
              name={
                completed
                  ? 'checkmark-circle-outline'
                  : 'locate-outline'
              }
              size={18}
              color={
                completed
                  ? theme.mutedText
                  : theme.buttonText
              }
            />
          )}

          <Text
            style={[
              styles.verifyButtonText,
              {
                color:
                  completed
                    ? theme.mutedText
                    : theme.buttonText,
              },
            ]}
          >
            {completed
              ? '방문 인증 완료'
              : '현재 위치로 인증'}
          </Text>
        </Pressable>
        
         {__DEV__ && (
          <Pressable
            onPress={
              completeForDevelopment
            }
            style={[
              styles.developmentButton,
              {
                borderColor:
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 4
                    : theme.radius.button,
              },
            ]}
          >
            <Text
              style={[
                styles.developmentButtonText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              개발 테스트로 완료하기
            </Text>
          </Pressable>
        )}

      </ScrollView>


      <Modal
        visible={
          !!resultModal
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setResultModal(null)
        }
      >
        <View
          style={
            styles.modalBackdrop
          }
        >
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  theme.radius.modal,
              },
            ]}
          >
            <Ionicons
              name={
                resultModal?.success
                  ? 'checkmark-circle-outline'
                  : 'information-circle-outline'
              }
              size={30}
              color={
                theme.button
              }
            />

            <Text
              style={[
                styles.modalTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {resultModal?.title}
            </Text>

            <Text
              style={[
                styles.modalMessage,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {resultModal?.message}
            </Text>

            <Pressable
              onPress={() =>
                setResultModal(null)
              }
              style={[
                styles.modalButton,
                {
                  borderColor:
                    theme.strongLine,
                  borderRadius:
                    theme.radius.button,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                확인
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RewardRow({
  icon,
  label,
  theme,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  theme: any;
}) {
  return (
    <View
      style={
        styles.rewardRow
      }
    >
      <Ionicons
        name={icon}
        size={18}
        color={
          theme.button
        }
      />

      <Text
        style={[
          styles.rewardText,
          {
            color:
              theme.text,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    centerScreen: {
      flex: 1,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    header: {
      minHeight: 72,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },

    backButton: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    headerTextBox: {
      flex: 1,
      minWidth: 0,
    },

    headerTitle: {
      fontSize: 22,
      fontWeight: '900',
    },

    headerSubtitle: {
      marginTop: 3,
      fontSize: 11,
      fontWeight: '700',
    },

    statusBadge: {
      minWidth: 58,
      height: 32,
      paddingHorizontal: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    statusText: {
      fontSize: 10,
      fontWeight: '900',
    },

    heroCard: {
      marginHorizontal: 14,
      padding: 18,
      borderWidth: 1,
      alignItems: 'center',
    },

    placeIconBox: {
      width: 54,
      height: 54,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    placeName: {
      marginTop: 12,
      fontSize: 20,
      fontWeight: '900',
    },

    description: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 19,
      textAlign: 'center',
    },

    typeTag: {
      marginTop: 13,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 0.5,
    },

    typeTagText: {
      fontSize: 9,
      fontWeight: '800',
    },

    sectionCard: {
      marginTop: 11,
      marginHorizontal: 14,
      padding: 15,
      borderWidth: 1,
    },

    sectionTitle: {
      marginBottom: 11,
      fontSize: 15,
      fontWeight: '900',
    },

    rewardRow: {
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    rewardText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '800',
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    infoTextBox: {
      flex: 1,
    },

    infoTitle: {
      fontSize: 12,
      fontWeight: '900',
    },

    infoDescription: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: '600',
      lineHeight: 16,
    },

    coordinateNotice: {
      marginTop: 12,
      fontSize: 9,
      fontWeight: '700',
      lineHeight: 15,
    },

    verifyButton: {
      height: 43,
      marginTop: 14,
      marginHorizontal: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 7,
    },

    verifyButtonText: {
      fontSize: 12,
      fontWeight: '900',
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: '900',
    },

    simpleButton: {
      marginTop: 18,
      height: 38,
      paddingHorizontal: 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    modalBackdrop: {
      flex: 1,
      paddingHorizontal: 24,
      backgroundColor:
        'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    modalBox: {
      width: '100%',
      maxWidth: 380,
      padding: 20,
      borderWidth: 1,
      alignItems: 'center',
    },

    modalTitle: {
      marginTop: 10,
      fontSize: 17,
      fontWeight: '900',
      textAlign: 'center',
    },

    modalMessage: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 18,
      textAlign: 'center',
    },

    modalButton: {
      height: 36,
      marginTop: 17,
      paddingHorizontal: 24,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    modalButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },
    developmentButton: {
  height: 38,

  marginTop: 8,
  marginHorizontal: 14,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

developmentButtonText: {
  fontSize: 10,
  fontWeight: '800',
},
  });