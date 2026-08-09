import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect, useState } from "react";
import {
  BackHandler,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import RootySprite from "../components/rooty/RootySprite";
import type { RootyAction } from "../constants/rootyAssets";
import type { RootyDirection } from "../constants/rootyDirectionalAssets";
import { useRootTheme } from "../store/rootTheme";
import {
  buildingImages as homeBuildingImages,
} from "../components/home/homeExplorationAssets";
import {
  buildingOffsets as homeBuildingOffsets,
  buildingImageSizes as homeBuildingImageSizes,
  buildingSizes as homeBuildingSizes,
} from "../components/home/homeVillageLayout";

const grassTile = require("../assets/village/tiles/grass_tile.png");

const foxImage = require("../assets/village/characters/fox_down_right.png");

const TILE_WIDTH = 190;
const TILE_HEIGHT = 95;
const GRID_SIZE = 12;

const MAP_WIDTH = 1600;
const MAP_HEIGHT = 1200;

const INITIAL_SCALE = 0.36;
const INITIAL_MAP_LEFT = -470;
const INITIAL_MAP_TOP = -120;

const VILLAGE_LIKE_STORAGE_KEY = "root_friend_village_likes_v1";

const buildingImages: Record<string, any> =
  homeBuildingImages;

const buildingOffsets: Record<
  string,
  {
    x: number;
    y: number;
  }
> = homeBuildingOffsets;

const buildingImageSizes: Record<string, number> =
  homeBuildingImageSizes;

const buildingSizes: Record<
  string,
  {
    cols: number;
    rows: number;
  }
> = homeBuildingSizes;

type PlacedBuilding = {
  id?: string;

  placedId?: string | number;

  col?: number;
  row?: number;

  flipped?: boolean;
};









function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePlacedBuildings(
  value: string | string[] | undefined,
): PlacedBuilding[] {
  const rawValue = getParam(value);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is PlacedBuilding =>
      Boolean(item && typeof item === "object" && typeof item.id === "string"),
    );
  } catch (error) {
    console.log("FRIEND VILLAGE PARSE ERROR", error);

    return [];
  }
}

function gridToScreen(col: number, row: number) {
  return {
    x: col * (TILE_WIDTH / 2) - row * (TILE_WIDTH / 2) + 430,

    y: col * (TILE_HEIGHT / 2) + row * (TILE_HEIGHT / 2) - 80,
  };
}

function clamp(value: number, min: number, max: number) {
  "worklet";

  return Math.max(min, Math.min(value, max));
}

export default function FriendVillageScreen() {
  const { themeMode, theme } = useRootTheme();

  const isCityBlack = themeMode === "cityBlack";

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const isLandscape = screenWidth > screenHeight;


  const openLandscapeView = async () => {
    try {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      );
    } catch (error) {
      console.log("FRIEND VILLAGE LANDSCAPE ERROR", error);
    }
  };


  const restorePortraitView = async () => {
    try {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    } catch (error) {
      console.log("FRIEND VILLAGE PORTRAIT ERROR", error);
    }
  };

  useEffect(() => {
    /*
     * 이 화면에서만 기기 회전을 허용합니다.
     * 화면을 나가면 나머지 앱은 다시 세로로 고정합니다.
     */
    ScreenOrientation.unlockAsync().catch((error) => {
      console.log("FRIEND VILLAGE ORIENTATION UNLOCK ERROR", error);
    });

    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch((error) => {
        console.log("FRIEND VILLAGE ORIENTATION RESTORE ERROR", error);
      });
    };
  }, []);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!isLandscape) {
          return false;
        }

        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        ).catch((error) => {
          console.log("FRIEND VILLAGE PORTRAIT RESTORE ERROR", error);
        });

        return true;
      },
    );

    return () => {
      backSubscription.remove();
    };
  }, [isLandscape]);

  const params = useLocalSearchParams<{
    userId?: string | string[];

    nickname?: string | string[];

    profileEmoji?: string | string[];

    placedBuildings?: string | string[];

    isOwnVillage?: string | string[];

    rootyAction?: string | string[];

    rootyDirection?: string | string[];

    rootyX?: string | string[];

    rootyY?: string | string[];
  }>();

  const userId = String(getParam(params.userId) ?? "").trim();

  const nickname = String(getParam(params.nickname) ?? "").trim() || "루트유저";

  const profileEmoji =
    String(getParam(params.profileEmoji) ?? "").trim() || "🦊";

  const placedBuildings = parsePlacedBuildings(params.placedBuildings);

  const isOwnVillage =
    getParam(params.isOwnVillage) === "1";
  // ROOTY_BEHAVIOR_V35_OWN_VILLAGE_LARGE_VIEW_ROOTY
  const rootyActionParam =
    String(
      getParam(params.rootyAction) ??
        ""
    ).trim();

  const rootyAction: RootyAction =
    rootyActionParam === "sit" ||
    rootyActionParam === "sleep" ||
    rootyActionParam === "idle"
      ? rootyActionParam
      : "idle";

  const rootyDirectionParam =
    String(
      getParam(params.rootyDirection) ??
        ""
    ).trim();

  const rootyDirection: RootyDirection =
    rootyDirectionParam === "downRight" ||
    rootyDirectionParam === "downLeft" ||
    rootyDirectionParam === "upRight" ||
    rootyDirectionParam === "upLeft"
      ? rootyDirectionParam
      : "downRight";

  const parsedRootyX =
    Number(
      getParam(params.rootyX)
    );

  const parsedRootyY =
    Number(
      getParam(params.rootyY)
    );

  const rootyX =
    Number.isFinite(parsedRootyX)
      ? parsedRootyX
      : 430;

  const rootyY =
    Number.isFinite(parsedRootyY)
      ? parsedRootyY
      : 250;

  /*
   * 사용자 ID가 전달되지 않은 예전 이동 코드도
   * 닉네임을 기준으로 이뻐요 상태를 구분합니다.
   */
  const villageOwnerKey = userId || `nickname:${nickname}`;

  const [isVillageLiked, setIsVillageLiked] = useState(false);

  useEffect(() => {
    if (isOwnVillage) {
      setIsVillageLiked(false);

      return;
    }

    let active = true;

    const loadLike = async () => {
      try {
        const raw = await AsyncStorage.getItem(VILLAGE_LIKE_STORAGE_KEY);

        const saved = raw ? JSON.parse(raw) : {};

        if (!active) {
          return;
        }

        setIsVillageLiked(saved?.[villageOwnerKey] === true);
      } catch (error) {
        console.log("FRIEND VILLAGE LIKE LOAD ERROR", error);
      }
    };

    void loadLike();

    return () => {
      active = false;
    };
  }, [isOwnVillage, villageOwnerKey]);

  const toggleVillageLike = async () => {
    if (isOwnVillage) {
      return;
    }

    const nextLiked = !isVillageLiked;

    setIsVillageLiked(nextLiked);

    try {
      const raw = await AsyncStorage.getItem(VILLAGE_LIKE_STORAGE_KEY);

      const saved = raw ? JSON.parse(raw) : {};

      const nextSaved = {
        ...(saved && typeof saved === "object" ? saved : {}),

        [villageOwnerKey]: nextLiked,
      };

      await AsyncStorage.setItem(
        VILLAGE_LIKE_STORAGE_KEY,

        JSON.stringify(nextSaved),
      );
    } catch (error) {
      console.log("FRIEND VILLAGE LIKE SAVE ERROR", error);

      setIsVillageLiked(!nextLiked);
    }
  };

  const scale = useSharedValue(INITIAL_SCALE);

  const savedScale = useSharedValue(INITIAL_SCALE);

  const translateX = useSharedValue(0);

  const translateY = useSharedValue(0);

  const savedTranslateX = useSharedValue(0);

  const savedTranslateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onUpdate((event) => {
      translateX.value = clamp(
        savedTranslateX.value + event.translationX,

        -720,
        720,
      );

      translateY.value = clamp(
        savedTranslateY.value + event.translationY,

        -520,
        520,
      );
    })
    .onFinalize(() => {
      savedTranslateX.value = translateX.value;

      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clamp(
        savedScale.value * event.scale,

        0.2,
        0.82,
      );
    })
    .onFinalize(() => {
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedMapStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: translateX.value,
      },
      {
        translateY: translateY.value,
      },
      {
        scale: scale.value,
      },
    ],
  }));

  return (
    <GestureHandlerRootView
      style={[
        styles.root,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <StatusBar hidden={isLandscape} />

      <View
        style={[
          styles.screen,
          {
            paddingHorizontal: isLandscape ? 0 : 12,

            paddingTop: isLandscape ? 0 : 42,

            paddingBottom: isLandscape ? 0 : 26,
          },
        ]}
      >
        {!isLandscape ? (
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                {
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.backText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                ← 뒤로가기
              </Text>
            </Pressable>

            <Pressable
              onPress={openLandscapeView}
              style={({ pressed }) => [
                styles.landscapeButton,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 10,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.landscapeButtonText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                가로로 보기
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.card,
            {
              flex: isLandscape ? 1 : 0,

              marginTop: isLandscape ? 0 : 14,

              padding: isLandscape ? 0 : 10,

              backgroundColor: isLandscape ? "#24345f" : theme.card,

              borderColor: isLandscape ? "transparent" : theme.line,

              borderRadius: isLandscape ? 0 : isCityBlack ? 4 : 18,

              borderWidth: isLandscape ? 0 : 0.5,
            },
          ]}
        >
          <GestureDetector gesture={composedGesture}>
            <View
              style={[
                styles.villageViewport,
                {
                  flex: isLandscape ? 1 : 0,

                  height: isLandscape
                    ? undefined
                    : Math.round(screenHeight * 0.60),

                  minHeight: isLandscape ? 0 : 420,

                  backgroundColor: isCityBlack ? theme.card2 : "#24345f",

                  borderColor: isLandscape
                    ? "transparent"
                    : isCityBlack
                    ? theme.line
                    : "#43558c",

                  borderRadius: isLandscape ? 0 : isCityBlack ? 4 : 16,

                  borderWidth: isLandscape ? 0 : 0.5,
                },
              ]}
            >
              {!isLandscape ? (
                <View
                  pointerEvents="none"
                  style={styles.profileOverlay}
                >
                  <Text style={styles.profileEmoji}>{profileEmoji}</Text>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.nickname,
                      {
                        color: isCityBlack ? theme.text : "#fff8ee",
                      },
                    ]}
                  >
                    {nickname}
                  </Text>
                </View>
              ) : null}

              <Animated.View style={[styles.tileMap, animatedMapStyle]}>
                {Array.from({
                  length: GRID_SIZE * GRID_SIZE,
                }).map((_, index) => {
                  const row = Math.floor(index / GRID_SIZE);

                  const col = index % GRID_SIZE;

                  const position = gridToScreen(col, row);

                  return (
                    <Image
                      key={`tile-${index}`}
                      source={grassTile}
                      style={[
                        styles.tile,
                        {
                          left: position.x,

                          top: position.y,
                        },
                      ]}
                    />
                  );
                })}

                {placedBuildings.map((building, index) => {
                  const id = String(building.id ?? "");

                  const source = buildingImages[id];

                  if (!source) {
                    return null;
                  }

                  const col = Number.isFinite(Number(building.col))
                    ? Number(building.col)
                    : 5;

                  const row = Number.isFinite(Number(building.row))
                    ? Number(building.row)
                    : 5;

                  const position = gridToScreen(col, row);

                  const offset = buildingOffsets[id] ?? {
                    x: -70,
                    y: -210,
                  };

                  const imageSize = buildingImageSizes[id] ?? 360;

                  const gridSize = buildingSizes[id] ?? {
                    cols: 1,
                    rows: 1,
                  };

                  return (
                    <Image
                      key={String(building.placedId ?? `${id}-${index}`)}
                      source={source}
                      resizeMode="contain"
                      style={{
                        position: "absolute",

                        width: imageSize,

                        height: imageSize,

                        left: position.x + offset.x,

                        top: position.y + offset.y,

                        zIndex: (row + col + gridSize.rows) * 100,

                        transform: [
                          {
                            scaleX: building.flipped ? -1 : 1,
                          },
                        ],
                      }}
                    />
                  );
                })}

                {isOwnVillage ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.rootyCharacter,
                      {
                        left:
                          rootyX,
                        top:
                          rootyY,
                      },
                    ]}
                  >
                    <RootySprite
                      action={
                        rootyAction
                      }
                      direction={
                        rootyDirection
                      }
                      size={80}
                      playing
                      enableMotion={
                        false
                      }
                    />
                  </View>
                ) : (
                  <Image
                    source={foxImage}
                    resizeMode="contain"
                    style={
                      styles.character
                    }
                  />
                )}
              </Animated.View>

              {placedBuildings.length === 0 ? (
                <View pointerEvents="none" style={styles.emptyOverlay}>
                  

                           </View>
              ) : null}
            </View>
          </GestureDetector>

          {isLandscape ? (
            <Pressable
              onPress={restorePortraitView}
              style={({ pressed }) => [
                styles.restorePortraitButton,
                {
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text style={styles.restorePortraitButtonText}>
                원래대로 보기
              </Text>
            </Pressable>
          ) : null}

          {!isLandscape && !isOwnVillage ? (
            <View style={styles.likeRow}>
              <Pressable
                onPress={toggleVillageLike}
                style={({ pressed }) => [
                  styles.likeButton,
                  {
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.likeButtonText,
                    {
                      color: isVillageLiked ? theme.text : theme.subText,
                    },
                  ]}
                >
                  {isVillageLiked ? "👏 이뻐요 취소" : "👏 이뻐요"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  screen: {
    flex: 1,
  },

  topBar: {
    minHeight: 36,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    alignSelf: "flex-start",

    paddingVertical: 6,
  },

  landscapeButton: {
    minHeight: 30,

    paddingHorizontal: 11,

    borderWidth: 0.5,

    alignItems: "center",
    justifyContent: "center",
  },

  landscapeButtonText: {
    fontSize: 11,
    fontWeight: "900",
  },

  restorePortraitButton: {
    position: "absolute",

    top: 14,
    right: 18,

    zIndex: 200000,

    minHeight: 34,

    paddingHorizontal: 13,

    backgroundColor: "rgba(255, 248, 238, 0.92)",

    borderWidth: 0.5,
    borderColor: "rgba(216, 185, 116, 0.95)",
    borderRadius: 10,

    alignItems: "center",
    justifyContent: "center",
  },

  restorePortraitButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#5b3218",
  },

  backText: {
    fontSize: 15,
    fontWeight: "900",
  },

  card: {
    position: "relative",
  },

  profileOverlay: {
    position: "absolute",

    left: 12,
    top: 12,

    zIndex: 100000,

    maxWidth: "76%",
    minHeight: 38,

    flexDirection: "row",
    alignItems: "center",
  },

  profileEmoji: {
    width: 35,

    marginRight: 7,

    fontSize: 27,

    textAlign: "center",
  },

  nickname: {
    flexShrink: 1,

    fontSize: 16,
    fontWeight: "900",

    textShadowColor: "rgba(0, 0, 0, 0.35)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },

  villageViewport: {
    width: "100%",

    position: "relative",

    overflow: "hidden",
  },

  tileMap: {
    position: "absolute",

    width: MAP_WIDTH,

    height: MAP_HEIGHT,

    left: INITIAL_MAP_LEFT,

    top: INITIAL_MAP_TOP,
  },

  tile: {
    position: "absolute",

    /*
     * 배치 좌표는 190 × 95를 유지하고,
     * 실제 타일만 220 × 110으로 겹쳐서
     * 파란 빈틈이 생기지 않게 합니다.
     */
    width: 220,
    height: 110,
  },

  character: {
    position: "absolute",

    left: 385,
    top: 330,

    width: 110,
    height: 110,

    zIndex: 99999,
  },

  rootyCharacter: {
    position: "absolute",

    width: 80,
    height: 80,

    zIndex: 99999,
  },

  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyText: {
    marginTop: 8,

    fontSize: 13,
    fontWeight: "900",
  },

  likeRow: {
    minHeight: 30,

    marginTop: 5,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "flex-end",
  },

  likeButton: {
    minHeight: 26,

    paddingHorizontal: 4,

    alignItems: "center",

    justifyContent: "center",
  },

  likeButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
});
