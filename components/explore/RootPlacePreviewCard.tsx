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
  onCommunitySafety:
    (
      action:
        | 'report'
        | 'hide'
        | 'unhide'
    ) => void;
  showModeratorEntry?: boolean;
  onOpenModerator?: () => void;
};

export default function RootPlacePreviewCard({
  place,
  districtName,
  onOpenDetail,
  onSave,
  onDirections,
  onShare,
  onContribution,
  onCommunitySafety,
  showModeratorEntry = false,
  onOpenModerator,
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

  const catalogPhotoCount =
    Math.max(
      0,
      Number(
        place?.photoCount ??
          place?.imageCount ??
          0
      ) || 0
    );

  const rootCommunityPhotoCount =
    Math.max(
      0,
      Number(
        place?.rootCommunityPhotoCount ??
          0
      ) || 0
    );

  const rootPublicCommunityPhotoCount =
    Math.max(
      0,
      Number(
        place?.rootPublicCommunityPhotoCount ??
          0
      ) || 0
    );

  const photoCount =
    catalogPhotoCount +
    rootPublicCommunityPhotoCount +
    rootCommunityPhotoCount;

  const publicCommunityHighlights =
    Array.isArray(
      place?.rootPublicCommunityHighlights
    )
      ? place
          .rootPublicCommunityHighlights
          .slice(0, 3)
      : [];

  const publicApprovedReportCount =
    Math.max(
      0,
      Number(
        place?.rootPublicApprovedReportCount ??
          0
      ) || 0
    );

  const communityHighlights =
    Array.isArray(
      place?.rootCommunityHighlights
    )
      ? place
          .rootCommunityHighlights
          .slice(0, 3)
      : [];

  const publicCommunityHidden =
    place?.rootPublicCommunityHidden ===
    true;

  const hasPublicCommunity =
    publicCommunityHidden ||
    rootPublicCommunityPhotoCount >
      0 ||
    publicApprovedReportCount >
      0 ||
    publicCommunityHighlights.length >
      0;

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

      {/* ROOT_EXPLORE_V12A_QUICK_LIVE_REPORTS */}
      <View
        style={
          styles.contributionRow
        }
      >
        <ContributionButton
          icon="storefront-outline"
          title="야외석 운영"
          description="오늘 야장 운영 여부"
          onPress={() =>
            onContribution(
              'outdoor_status'
            )
          }
        />
        <ContributionButton
          icon="umbrella-outline"
          title="우천 이용"
          description="비 올 때 이용 가능 여부"
          onPress={() =>
            onContribution(
              'rain_status'
            )
          }
        />
        <ContributionButton
          icon="checkmark-circle-outline"
          title="방문 인증"
          description="지금 방문을 기록해요"
          onPress={() =>
            onContribution(
              'visit'
            )
          }
        />
      </View>

      {/* ROOT_EXPLORE_V12C_APPROVED_PUBLIC_HIGHLIGHTS */}
      {publicCommunityHighlights.length >
      0 ? (
        <View
          style={[
            styles.publicCommunityCard,
            {
              backgroundColor:
                theme.background,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 2
                  : 14,
            },
          ]}
        >
          <View
            style={
              styles.publicCommunityHeader
            }
          >
            <Text
              style={[
                styles.publicCommunityTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              ROOT 커뮤니티 현황
            </Text>

            <Text
              style={[
                styles.publicCommunityBadge,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              승인 {publicApprovedReportCount}
            </Text>
          </View>

          {publicCommunityHighlights.map(
            (
              highlight: any
            ) => (
              <View
                key={
                  String(
                    highlight?.id ??
                      highlight?.label
                  )
                }
                style={
                  styles.publicCommunityRow
                }
              >
                <View
                  style={
                    styles.publicCommunityDot
                  }
                />

                <Text
                  numberOfLines={1}
                  style={[
                    styles.publicCommunityLabel,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {String(
                    highlight?.label ??
                      '승인된 현장 제보'
                  )}
                </Text>

                {Number(
                  highlight?.reportCount ??
                    0
                ) > 1 ? (
                  <Text
                    style={[
                      styles.publicCommunityCount,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {Number(
                      highlight?.reportCount
                    )}명
                  </Text>
                ) : null}

                <Text
                  style={[
                    styles.publicCommunityTime,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  {formatRootCommunityAgeLabel(
                    highlight?.observedAt
                  )}
                </Text>
              </View>
            )
          )}
        </View>
      ) : null}

      {/* ROOT_EXPLORE_V12B_RECENT_PENDING_HIGHLIGHTS */}
      {communityHighlights.length >
      0 ? (
        <View
          style={[
            styles.communityHighlightCard,
            {
              backgroundColor:
                theme.background,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 2
                  : 14,
            },
          ]}
        >
          <View
            style={
              styles.communityHighlightHeader
            }
          >
            <Text
              style={[
                styles.communityHighlightTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              내 최근 현장 제보
            </Text>

            <Text
              style={[
                styles.communityPendingBadge,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              검수 대기
            </Text>
          </View>

          {communityHighlights.map(
            (
              highlight: any
            ) => (
              <View
                key={
                  String(
                    highlight?.id ??
                      highlight?.label
                  )
                }
                style={
                  styles.communityHighlightRow
                }
              >
                <View
                  style={
                    styles.communityHighlightDot
                  }
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.communityHighlightLabel,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {String(
                    highlight?.label ??
                      '현장 정보를 제보했어요'
                  )}
                </Text>
                <Text
                  style={[
                    styles.communityHighlightTime,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  {formatRootCommunityAgeLabel(
                    highlight?.observedAt
                  )}
                </Text>
              </View>
            )
          )}
        </View>
      ) : null}

      {/* ROOT_EXPLORE_V12D_COMMUNITY_SAFETY_ACTIONS */}
      {hasPublicCommunity ? (
        <View
          style={[
            styles.communitySafetyRow,
            {
              borderColor:
                theme.line,
            },
          ]}
        >
          {publicCommunityHidden ? (
            <>
              <View
                style={
                  styles.communitySafetyLabelWrap
                }
              >
                <Ionicons
                  name="eye-off-outline"
                  size={14}
                  color={
                    theme.subText
                  }
                />
                <Text
                  style={[
                    styles.communitySafetyLabel,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  ROOT 커뮤니티 숨김 중
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  onCommunitySafety(
                    'unhide'
                  )
                }
                style={({ pressed }) => ({
                  opacity:
                    pressed
                      ? 0.55
                      : 1,
                })}
              >
                <Text
                  style={[
                    styles.communitySafetyActionText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  다시 보기
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={() =>
                  onCommunitySafety(
                    'report'
                  )
                }
                style={
                  styles.communitySafetyAction
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={13}
                  color={
                    theme.subText
                  }
                />
                <Text
                  style={[
                    styles.communitySafetyActionText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  신고
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  onCommunitySafety(
                    'hide'
                  )
                }
                style={
                  styles.communitySafetyAction
                }
              >
                <Ionicons
                  name="eye-off-outline"
                  size={13}
                  color={
                    theme.subText
                  }
                />
                <Text
                  style={[
                    styles.communitySafetyActionText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  숨기기
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      {showModeratorEntry &&
      onOpenModerator ? (
        <Pressable
          onPress={
            onOpenModerator
          }
          style={[
            styles.moderatorEntry,
            {
              borderColor:
                theme.line,
            },
          ]}
        >
          <View
            style={
              styles.moderatorEntryLabel
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={
                ROOT_EXPLORE_ACCENT
              }
            />
            <Text
              style={[
                styles.moderatorEntryText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              관리자 장소 검수
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={14}
            color={
              theme.subText
            }
          />
        </Pressable>
      ) : null}

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

function formatRootCommunityAgeLabel(
  value: unknown
) {
  const timestamp =
    Date.parse(
      String(
        value ?? ''
      )
    );

  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return '';
  }

  const diffMs =
    Math.max(
      0,
      Date.now() -
      timestamp
    );

  const minutes =
    Math.floor(
      diffMs /
      60_000
    );

  if (
    minutes < 1
  ) {
    return '방금';
  }

  if (
    minutes < 60
  ) {
    return `${minutes}분 전`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (
    hours < 24
  ) {
    return `${hours}시간 전`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  return `${days}일 전`;
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
    | 'people-outline'
    | 'storefront-outline'
    | 'umbrella-outline'
    | 'checkmark-circle-outline';
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

    publicCommunityCard: {
      marginTop: 12,
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      gap: 7,
    },

    publicCommunityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 8,
    },

    publicCommunityTitle: {
      fontSize: 10.5,
      lineHeight: 15,
      fontWeight: '900',
    },

    publicCommunityBadge: {
      fontSize: 8.5,
      lineHeight: 12,
      fontWeight: '800',
    },

    publicCommunityRow: {
      minHeight: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    publicCommunityDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor:
        '#3D9661',
    },

    publicCommunityLabel: {
      flex: 1,
      minWidth: 0,
      fontSize: 9.2,
      lineHeight: 13,
      fontWeight: '700',
    },

    publicCommunityCount: {
      fontSize: 8.3,
      lineHeight: 12,
      fontWeight: '700',
    },

    publicCommunityTime: {
      fontSize: 8.3,
      lineHeight: 12,
      fontWeight: '600',
    },

    communityHighlightCard: {
      marginTop: 12,
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      gap: 7,
    },

    communityHighlightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 8,
    },

    communityHighlightTitle: {
      fontSize: 10.5,
      lineHeight: 15,
      fontWeight: '900',
    },

    communityPendingBadge: {
      fontSize: 8.5,
      lineHeight: 12,
      fontWeight: '700',
    },

    communityHighlightRow: {
      minHeight: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    communityHighlightDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor:
        ROOT_EXPLORE_ACCENT,
    },

    communityHighlightLabel: {
      flex: 1,
      minWidth: 0,
      fontSize: 9.2,
      lineHeight: 13,
      fontWeight: '700',
    },

    communityHighlightTime: {
      fontSize: 8.3,
      lineHeight: 12,
      fontWeight: '600',
    },

    communitySafetyRow: {
      marginTop: 10,
      minHeight: 34,
      paddingHorizontal: 8,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'flex-end',
      gap: 14,
    },

    communitySafetyLabelWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    communitySafetyLabel: {
      fontSize: 8.8,
      lineHeight: 12,
      fontWeight: '700',
    },

    communitySafetyAction: {
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    communitySafetyActionText: {
      fontSize: 8.8,
      lineHeight: 12,
      fontWeight: '800',
    },

    moderatorEntry: {
      marginTop: 8,
      minHeight: 36,
      paddingHorizontal: 9,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    moderatorEntryLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    moderatorEntryText: {
      fontSize: 9,
      lineHeight: 13,
      fontWeight: '800',
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
