// ROOT_PLACE_V12_MEDIA_FEED_MODAL

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  VideoView,
  useVideoPlayer,
} from 'expo-video';

import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRootTheme,
} from '../../store/rootTheme';

import type {
  RootPlaceMedia,
} from '../../store/rootPlaceDomain';

import type {
  RootPlaceMediaDraft,
  RootPlaceMediaFeed,
} from '../../store/rootPlaceMedia';

const ACCENT =
  '#A96813';

type Props = {
  visible: boolean;
  placeName: string;
  loading: boolean;
  busy: boolean;
  feed: RootPlaceMediaFeed;
  onClose: () => void;
  onRefresh: () => void;
  onUpload: () => void;
  onDeleteMedia:
    (
      media: RootPlaceMedia,
    ) => void;
  onDeleteDraft:
    (
      draft: RootPlaceMediaDraft,
    ) => void;
};

export default function RootPlaceMediaModal({
  visible,
  placeName,
  loading,
  busy,
  feed,
  onClose,
  onRefresh,
  onUpload,
  onDeleteMedia,
  onDeleteDraft,
}: Props) {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const hasItems =
    feed.items.length > 0 ||
    feed.guestDrafts.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={
          styles.backdrop
        }
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor:
                theme.background,
              borderColor:
                theme.line,
              borderTopLeftRadius:
                isCityBlack
                  ? 4
                  : 22,
              borderTopRightRadius:
                isCityBlack
                  ? 4
                  : 22,
            },
          ]}
        >
          <View
            style={
              styles.header
            }
          >
            <View
              style={
                styles.headerText
              }
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {placeName}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                최신 사진·동영상
              </Text>
            </View>

            <Pressable
              hitSlop={8}
              disabled={busy}
              onPress={onRefresh}
              style={({
                pressed,
              }) => ({
                opacity:
                  pressed
                    ? 0.55
                    : 1,
              })}
            >
              <Ionicons
                name="refresh-outline"
                size={21}
                color={
                  theme.text
                }
              />
            </Pressable>

            <Pressable
              hitSlop={8}
              disabled={busy}
              onPress={onClose}
              style={({
                pressed,
              }) => ({
                opacity:
                  pressed
                    ? 0.55
                    : 1,
              })}
            >
              <Ionicons
                name="close"
                size={24}
                color={
                  theme.text
                }
              />
            </Pressable>
          </View>

          <View
            style={
              styles.summaryRow
            }
          >
            <StatusChip
              label={`공개 ${feed.visible.length}`}
            />
            <StatusChip
              label={`내 업로드 ${feed.own.length}`}
            />
            {feed.guestDrafts.length >
            0 ? (
              <StatusChip
                label={`게스트 임시 ${feed.guestDrafts.length}`}
              />
            ) : null}
          </View>

          <ScrollView
            contentContainerStyle={
              styles.content
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            {loading ? (
              <View
                style={
                  styles.empty
                }
              >
                <ActivityIndicator
                  color={ACCENT}
                />
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  장소 미디어를 불러오고 있어요.
                </Text>
              </View>
            ) : !hasItems ? (
              <View
                style={
                  styles.empty
                }
              >
                <Ionicons
                  name="images-outline"
                  size={34}
                  color={
                    theme.subText
                  }
                />
                <Text
                  style={[
                    styles.emptyTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  아직 등록된 사진이 없어요
                </Text>
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  첫 현장 사진이나 동영상을 남겨주세요.
                </Text>
              </View>
            ) : (
              <>
                {feed.items.map(
                  (media) => (
                    <MediaCard
                      key={
                        media.mediaId
                      }
                      media={media}
                      own={
                        feed.own.some(
                          (item) =>
                            item.mediaId ===
                            media.mediaId,
                        )
                      }
                      busy={busy}
                      onDelete={() =>
                        onDeleteMedia(
                          media,
                        )
                      }
                    />
                  ),
                )}

                {feed.guestDrafts.map(
                  (draft) => (
                    <GuestDraftCard
                      key={
                        draft.draftId
                      }
                      draft={draft}
                      busy={busy}
                      onDelete={() =>
                        onDeleteDraft(
                          draft,
                        )
                      }
                    />
                  ),
                )}
              </>
            )}
          </ScrollView>

          <Pressable
            disabled={busy}
            onPress={onUpload}
            style={({
              pressed,
            }) => [
              styles.uploadButton,
              {
                backgroundColor:
                  ACCENT,
                opacity:
                  busy
                    ? 0.45
                    : pressed
                      ? 0.7
                      : 1,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 13,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="camera-outline"
                size={18}
                color="#FFFFFF"
              />
            )}
            <Text
              style={
                styles.uploadText
              }
            >
              사진·동영상 추가
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  function StatusChip({
    label,
  }: {
    label: string;
  }) {
    return (
      <View
        style={[
          styles.chip,
          {
            backgroundColor:
              theme.card,
            borderColor:
              theme.line,
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            {
              color:
                theme.subText,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }

  function MediaCard({
    media,
    own,
    busy: cardBusy,
    onDelete,
  }: {
    media: RootPlaceMedia;
    own: boolean;
    busy: boolean;
    onDelete: () => void;
  }) {
    return (
      <View
        style={[
          styles.mediaCard,
          {
            backgroundColor:
              theme.card,
            borderColor:
              theme.line,
            borderRadius:
              isCityBlack
                ? 3
                : 15,
          },
        ]}
      >
        {media.kind ===
        'video' ? (
          <RootPlaceVideo
            uri={
              media.downloadUrl
            }
          />
        ) : (
          <Image
            source={{
              uri:
                media.downloadUrl,
            }}
            resizeMode="cover"
            style={
              styles.media
            }
          />
        )}

        <View
          style={
            styles.mediaFooter
          }
        >
          <View
            style={
              styles.mediaMeta
            }
          >
            <Text
              style={[
                styles.mediaStatus,
                {
                  color:
                    media.status ===
                    'visible'
                      ? '#3E7A4C'
                      : theme.subText,
                },
              ]}
            >
              {media.status ===
              'visible'
                ? '공개됨'
                : media.status ===
                    'hidden'
                  ? '숨김됨'
                  : '검수 대기'}
            </Text>
            <Text
              style={[
                styles.mediaDate,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {formatDate(
                media.createdAt,
              )}
            </Text>
          </View>

          {own ? (
            <Pressable
              hitSlop={8}
              disabled={cardBusy}
              onPress={onDelete}
            >
              <Ionicons
                name="trash-outline"
                size={17}
                color="#B64B45"
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  function GuestDraftCard({
    draft,
    busy: cardBusy,
    onDelete,
  }: {
    draft: RootPlaceMediaDraft;
    busy: boolean;
    onDelete: () => void;
  }) {
    return (
      <View
        style={[
          styles.mediaCard,
          {
            backgroundColor:
              theme.card,
            borderColor:
              theme.line,
            borderRadius:
              isCityBlack
                ? 3
                : 15,
          },
        ]}
      >
        {draft.kind ===
        'video' ? (
          <RootPlaceVideo
            uri={
              draft.localUri
            }
          />
        ) : (
          <Image
            source={{
              uri:
                draft.localUri,
            }}
            resizeMode="cover"
            style={
              styles.media
            }
          />
        )}
        <View
          style={
            styles.mediaFooter
          }
        >
          <View
            style={
              styles.mediaMeta
            }
          >
            <Text
              style={[
                styles.mediaStatus,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              게스트 로컬 임시저장
            </Text>
            <Text
              style={[
                styles.mediaDate,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              로그인 전에는 공개되지 않아요
            </Text>
          </View>
          <Pressable
            hitSlop={8}
            disabled={cardBusy}
            onPress={onDelete}
          >
            <Ionicons
              name="trash-outline"
              size={17}
              color="#B64B45"
            />
          </Pressable>
        </View>
      </View>
    );
  }
}

function RootPlaceVideo({
  uri,
}: {
  uri: string;
}) {
  const player =
    useVideoPlayer(
      uri,
      (instance) => {
        instance.loop =
          false;
      },
    );

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="cover"
      surfaceType="textureView"
      style={styles.media}
    />
  );
}

function formatDate(
  value: unknown,
) {
  const date =
    new Date(
      String(value ?? ''),
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '';
  }

  return date.toLocaleDateString(
    'ko-KR',
    {
      month: 'short',
      day: 'numeric',
    },
  );
}

const styles =
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent:
        'flex-end',
      backgroundColor:
        'rgba(0, 0, 0, 0.42)',
    },
    sheet: {
      maxHeight: '90%',
      minHeight: '64%',
      paddingTop: 10,
      paddingHorizontal: 14,
      paddingBottom: 18,
      borderWidth:
        StyleSheet.hairlineWidth,
    },
    header: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '900',
    },
    subtitle: {
      marginTop: 2,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '700',
    },
    summaryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    chip: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth:
        StyleSheet.hairlineWidth,
    },
    chipText: {
      fontSize: 9,
      fontWeight: '800',
    },
    content: {
      paddingBottom: 14,
    },
    empty: {
      minHeight: 260,
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 9,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '900',
    },
    emptyText: {
      textAlign: 'center',
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '700',
    },
    mediaCard: {
      overflow: 'hidden',
      marginBottom: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
    },
    media: {
      width: '100%',
      height: 230,
      backgroundColor:
        '#1B1B1B',
    },
    mediaFooter: {
      minHeight: 48,
      paddingHorizontal: 11,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    mediaMeta: {
      flex: 1,
    },
    mediaStatus: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '900',
    },
    mediaDate: {
      marginTop: 1,
      fontSize: 8.5,
      lineHeight: 12,
      fontWeight: '600',
    },
    uploadButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 8,
    },
    uploadText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
  });
