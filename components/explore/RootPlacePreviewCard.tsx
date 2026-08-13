// ROOT_EXPLORE_V1_ROOT_PLACE_PREVIEW_CARD

import {
  Ionicons,
} from '@expo/vector-icons';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRootTheme,
} from '../../store/rootTheme';
import {
  getRootExplorePlaceImageUrl,
  getRootExplorePlaceTags,
  type RootPlaceContributionKind,
} from '../../store/rootExplorePlace';

const ROOT_EXPLORE_ACCENT =
  '#A96813';

type Props = {
  place: any;
  districtName: string;
  onOpenDetail: () => void;
  onSave: () => void;
  onDirections: () => void;
  onShare: () => void;
  onContribution:
    (
      kind:
        RootPlaceContributionKind
    ) => void;
};

export default function RootPlacePreviewCard({
  place,
  districtName,
  onOpenDetail,
  onSave,
  onDirections,
  onShare,
  onContribution,
}: Props) {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const name =
    String(
      place?.name ??
        '탐험 장소'
    ).trim() ||
    '탐험 장소';

  const address =
    String(
      place?.address ??
        place?.locationText ??
        place?.placeAddress ??
        place?.districtName ??
        districtName
    ).trim() ||
    districtName;

  const imageUrl =
    getRootExplorePlaceImageUrl(
      place
    );

  const tags =
    getRootExplorePlaceTags(
      place
    );

  const icon =
    String(
      place?.icon ??
        '📍'
    );

  const photoCount =
    Math.max(
      0,
      Number(
        place?.photoCount ??
          place?.imageCount ??
          0
      ) || 0
    );

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor:
            theme.card,
          borderColor:
            theme.line,
          borderRadius:
            isCityBlack
              ? 4
              : 22,
        },
      ]}
    >
      <View
        style={[
          styles.handle,
          {
            backgroundColor:
              theme.line,
          },
        ]}
      />

      <View
        style={
          styles.heroRow
        }
      >
        <Pressable
          onPress={
            onOpenDetail
          }
          style={({ pressed }) => [
            styles.imageBox,
            {
              backgroundColor:
                theme.background,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 3
                  : 16,
              opacity:
                pressed
                  ? 0.7
                  : 1,
            },
          ]}
        >
          {imageUrl ? (
            <Image
              source={{
                uri: imageUrl,
              }}
              resizeMode="cover"
              style={
                styles.image
              }
            />
          ) : (
            <View
              style={
                styles.imageFallback
              }
            >
              <Text
                style={
                  styles.imageFallbackIcon
                }
              >
                {icon}
              </Text>
              <Text
                style={[
                  styles.imageFallbackText,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                사진 준비 중
              </Text>
            </View>
          )}

          <View
            style={
              styles.photoBadge
            }
          >
            <Ionicons
              name="camera-outline"
              size={12}
              color="#FFFFFF"
            />
            <Text
              style={
                styles.photoBadgeText
              }
            >
              {photoCount > 0
                ? photoCount
                : '0'}
            </Text>
          </View>
        </Pressable>

        <View
          style={
            styles.heroContent
          }
        >
          <Pressable
            onPress={
              onOpenDetail
            }
            style={({ pressed }) => ({
              opacity:
                pressed
                  ? 0.6
                  : 1,
            })}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.name,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {name}
            </Text>
          </Pressable>

          {tags.length > 0 ? (
            <View
              style={
                styles.tagRow
              }
            >
              {tags
                .slice(0, 3)
                .map(
                  (tag) => (
                    <View
                      key={tag}
                      style={[
                        styles.tag,
                        {
                          backgroundColor:
                            theme.background,
                          borderColor:
                            theme.line,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 999,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.tagText,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {tag}
                      </Text>
                    </View>
                  )
                )}
            </View>
          ) : null}

          <View
            style={
              styles.metaRow
            }
          >
            <Ionicons
              name="location-outline"
              size={15}
              color={
                ROOT_EXPLORE_ACCENT
              }
            />
            <Text
              numberOfLines={2}
              style={[
                styles.metaText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {address}
            </Text>
          </View>

          <View
            style={
              styles.metaRow
            }
          >
            <Ionicons
              name="sparkles-outline"
              size={14}
              color={
                ROOT_EXPLORE_ACCENT
              }
            />
            <Text
              numberOfLines={1}
              style={[
                styles.metaText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              ROOT 탐험 장소
            </Text>
          </View>
        </View>
      </View>

      <View
        style={
          styles.actionRow
        }
      >
        <ActionButton
          icon="bookmark-outline"
          label="저장"
          primary
          onPress={onSave}
        />
        <ActionButton
          icon="navigate-outline"
          label="길찾기"
          onPress={
            onDirections
          }
        />
        <ActionButton
          icon="share-social-outline"
          label="공유"
          onPress={onShare}
        />
      </View>

      <View
        style={[
          styles.tabCard,
          {
            backgroundColor:
              theme.background,
            borderColor:
              theme.line,
            borderRadius:
              isCityBlack
                ? 3
                : 15,
          },
        ]}
      >
        <Pressable
          onPress={
            onOpenDetail
          }
          style={
            styles.tabButton
          }
        >
          <Text
            style={[
              styles.tabTextActive,
              {
                color:
                  theme.text,
              },
            ]}
          >
            홈
          </Text>
          <View
            style={[
              styles.tabUnderline,
              {
                backgroundColor:
                  ROOT_EXPLORE_ACCENT,
              },
            ]}
          />
        </Pressable>

        <Pressable
          onPress={() =>
            onContribution(
              'photo'
            )
          }
          style={
            styles.tabButton
          }
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            사진
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            onContribution(
              'correction'
            )
          }
          style={
            styles.tabButton
          }
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            후기
          </Text>
        </Pressable>
      </View>

      <Text
        style={[
          styles.contributionTitle,
          {
            color:
              theme.text,
          },
        ]}
      >
        함께 만들어가는 장소
      </Text>

      <View
        style={
          styles.contributionRow
        }
      >
        <ContributionButton
          icon="camera-outline"
          title="사진 추가하기"
          description="현장 사진을 남겨주세요"
          onPress={() =>
            onContribution(
              'photo'
            )
          }
        />
        <ContributionButton
          icon="time-outline"
          title="영업시간 제보"
          description="정확한 시간을 알려주세요"
          onPress={() =>
            onContribution(
              'business_hours'
            )
          }
        />
        <ContributionButton
          icon="people-outline"
          title="웨이팅 현황"
          description="지금 얼마나 기다리나요?"
          onPress={() =>
            onContribution(
              'waiting'
            )
          }
        />
      </View>

      <Pressable
        onPress={
          onOpenDetail
        }
        style={({
          pressed,
        }) => [
          styles.moreRow,
          {
            opacity:
              pressed
                ? 0.6
                : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.moreLabel,
            {
              color:
                theme.subText,
            },
          ]}
        >
          최근 제보 하이라이트
        </Text>

        <View
          style={
            styles.moreAction
          }
        >
          <Text
            style={[
              styles.moreActionText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            더보기
          </Text>
          <Ionicons
            name="chevron-forward"
            size={15}
            color={
              theme.text
            }
          />
        </View>
      </Pressable>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  primary = false,
  onPress,
}: {
  icon:
    | 'bookmark-outline'
    | 'navigate-outline'
    | 'share-social-outline';
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor:
            primary
              ? ROOT_EXPLORE_ACCENT
              : theme.background,
          borderColor:
            primary
              ? ROOT_EXPLORE_ACCENT
              : theme.line,
          borderRadius:
            isCityBlack
              ? 2
              : 12,
          opacity:
            pressed
              ? 0.65
              : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={17}
        color={
          primary
            ? '#FFFFFF'
            : theme.text
        }
      />
      <Text
        style={[
          styles.actionText,
          {
            color:
              primary
                ? '#FFFFFF'
                : theme.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ContributionButton({
  icon,
  title,
  description,
  onPress,
}: {
  icon:
    | 'camera-outline'
    | 'time-outline'
    | 'people-outline';
  title: string;
  description: string;
  onPress: () => void;
}) {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.contributionButton,
        {
          backgroundColor:
            theme.background,
          borderColor:
            theme.line,
          borderRadius:
            isCityBlack
              ? 2
              : 13,
          opacity:
            pressed
              ? 0.65
              : 1,
        },
      ]}
    >
      <View
        style={[
          styles.contributionIcon,
          {
            backgroundColor:
              theme.card,
            borderColor:
              theme.line,
            borderRadius:
              isCityBlack
                ? 2
                : 999,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={
            ROOT_EXPLORE_ACCENT
          }
        />
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.contributionButtonTitle,
          {
            color:
              theme.text,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        numberOfLines={2}
        style={[
          styles.contributionDescription,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {description}
      </Text>
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    sheet: {
      marginTop: -22,
      marginHorizontal: 7,
      zIndex: 30,
      elevation: 8,
      paddingHorizontal: 13,
      paddingTop: 7,
      paddingBottom: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    handle: {
      alignSelf: 'center',
      width: 42,
      height: 4,
      borderRadius: 999,
      marginBottom: 10,
    },

    heroRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'stretch',
    },

    imageBox: {
      width: 112,
      minHeight: 112,
      borderWidth:
        StyleSheet.hairlineWidth,
      overflow: 'hidden',
      position: 'relative',
    },

    image: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },

    imageFallback: {
      flex: 1,
      minHeight: 112,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    imageFallbackIcon: {
      fontSize: 31,
    },

    imageFallbackText: {
      fontSize: 9,
      fontWeight: '800',
    },

    photoBadge: {
      position: 'absolute',
      right: 7,
      bottom: 7,
      minHeight: 24,
      paddingHorizontal: 7,
      flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      backgroundColor:
        'rgba(30,24,20,0.82)',
    },

    photoBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },

    heroContent: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 3,
    },

    name: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '900',
      letterSpacing: -0.45,
    },

    tagRow: {
      marginTop: 7,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
    },

    tag: {
      minHeight: 24,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    tagText: {
      maxWidth: 84,
      fontSize: 9,
      fontWeight: '800',
    },

    metaRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },

    metaText: {
      flex: 1,
      minWidth: 0,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '700',
    },

    actionRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 7,
    },

    actionButton: {
      flex: 1,
      minHeight: 44,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },

    actionText: {
      fontSize: 11,
      fontWeight: '900',
    },

    tabCard: {
      marginTop: 11,
      minHeight: 48,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'stretch',
      overflow: 'hidden',
    },

    tabButton: {
      flex: 1,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },

    tabText: {
      fontSize: 10.5,
      fontWeight: '800',
    },

    tabTextActive: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    tabUnderline: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 0,
      height: 2.5,
      borderRadius: 999,
    },

    contributionTitle: {
      marginTop: 13,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: -0.2,
    },

    contributionRow: {
      marginTop: 8,
      flexDirection: 'row',
      gap: 7,
    },

    contributionButton: {
      flex: 1,
      minHeight: 112,
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'flex-start',
    },

    contributionIcon: {
      width: 34,
      height: 34,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },

    contributionButtonTitle: {
      width: '100%',
      fontSize: 9.2,
      fontWeight: '900',
    },

    contributionDescription: {
      width: '100%',
      marginTop: 4,
      fontSize: 8,
      lineHeight: 11.5,
      fontWeight: '600',
    },

    moreRow: {
      marginTop: 12,
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    moreLabel: {
      fontSize: 9.5,
      fontWeight: '700',
    },

    moreAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },

    moreActionText: {
      fontSize: 9.5,
      fontWeight: '900',
    },
  });
