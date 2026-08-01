import { useState } from 'react';
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    useRootTheme,
} from '../store/rootTheme';

const grassTile =
  require(
    '../assets/village/tiles/grass_tile.png'
  );

const foxImage =
  require(
    '../assets/village/characters/fox_down_right.png'
  );

const TILE_WIDTH = 190;
const TILE_HEIGHT = 95;
const GRID_SIZE = 12;

const MAP_WIDTH = 1600;
const MAP_HEIGHT = 1200;

type PlacedBuilding = {
  id?: string;
  placedId?:
    | string
    | number;

  col?: number;
  row?: number;

  flipped?: boolean;
};

type RootVillagePreviewProps = {
  placedBuildings?:
    | PlacedBuilding[]
    | null;

  height?: number;

  showCharacter?: boolean;

  onPress?: () => void;
};

const buildingImages:
  Record<string, any> = {
  tree1:
    require(
      '../assets/village/buildings/tree1.png'
    ),

  tree2:
    require(
      '../assets/village/buildings/tree2.png'
    ),

  tree3:
    require(
      '../assets/village/buildings/tree3.png'
    ),

  tree4:
    require(
      '../assets/village/buildings/tree4.png'
    ),

  tree5:
    require(
      '../assets/village/buildings/tree5.png'
    ),

  tree6:
    require(
      '../assets/village/buildings/tree6.png'
    ),

  tree7:
    require(
      '../assets/village/buildings/tree7.png'
    ),

  building1:
    require(
      '../assets/village/buildings/building1.png'
    ),

  building2:
    require(
      '../assets/village/buildings/building2.png'
    ),

  building3:
    require(
      '../assets/village/buildings/building3.png'
    ),

  building4:
    require(
      '../assets/village/buildings/building4.png'
    ),

  building5:
    require(
      '../assets/village/buildings/building5.png'
    ),

  building6:
    require(
      '../assets/village/buildings/building6.png'
    ),

  building7:
    require(
      '../assets/village/buildings/building7.png'
    ),

  object1:
    require(
      '../assets/village/buildings/object1.png'
    ),

  object2:
    require(
      '../assets/village/buildings/object2.png'
    ),

  object3:
    require(
      '../assets/village/buildings/object3.png'
    ),
};

const buildingOffsets:
  Record<
    string,
    {
      x: number;
      y: number;
    }
  > = {
  tree1: {
    x: -70,
    y: -218,
  },

  tree2: {
    x: -70,
    y: -235,
  },

  tree3: {
    x: -75,
    y: -210,
  },

  tree4: {
    x: -75,
    y: -190,
  },

  tree5: {
    x: -75,
    y: -190,
  },

  tree6: {
    x: -75,
    y: -170,
  },

  tree7: {
    x: -5,
    y: -110,
  },

  building1: {
    x: -80,
    y: -150,
  },

  building2: {
    x: 0,
    y: -80,
  },

  building3: {
    x: -80,
    y: -100,
  },

  building4: {
    x: -80,
    y: -150,
  },

  building5: {
    x: 10,
    y: -80,
  },

  building6: {
    x: 10,
    y: -80,
  },

  building7: {
    x: 10,
    y: -80,
  },

  object1: {
    x: 60,
    y: -20,
  },

  object2: {
    x: 65,
    y: -25,
  },

  object3: {
    x: 59,
    y: -20,
  },
};

const buildingImageSizes:
  Record<
    string,
    number
  > = {
  object1: 90,
  object2: 90,
  object3: 90,

  tree7: 210,

  building2: 200,
  building5: 180,
  building6: 180,
  building7: 180,
};

const buildingSizes:
  Record<
    string,
    {
      cols: number;
      rows: number;
    }
  > = {
  tree1: {
    cols: 1,
    rows: 1,
  },

  tree2: {
    cols: 1,
    rows: 1,
  },

  tree3: {
    cols: 1,
    rows: 1,
  },

  tree4: {
    cols: 1,
    rows: 1,
  },

  tree5: {
    cols: 1,
    rows: 1,
  },

  tree6: {
    cols: 1,
    rows: 1,
  },

  tree7: {
    cols: 1,
    rows: 1,
  },

  building1: {
    cols: 2,
    rows: 2,
  },

  building2: {
    cols: 1,
    rows: 1,
  },

  building3: {
    cols: 2,
    rows: 2,
  },

  building4: {
    cols: 2,
    rows: 2,
  },

  building5: {
    cols: 1,
    rows: 1,
  },

  building6: {
    cols: 1,
    rows: 1,
  },

  building7: {
    cols: 1,
    rows: 1,
  },

  object1: {
    cols: 1,
    rows: 1,
  },

  object2: {
    cols: 1,
    rows: 1,
  },

  object3: {
    cols: 1,
    rows: 1,
  },
};

function gridToScreen(
  col: number,
  row: number
) {
  return {
    x:
      col *
        (TILE_WIDTH / 2) -
      row *
        (TILE_WIDTH / 2) +
      430,

    y:
      col *
        (TILE_HEIGHT / 2) +
      row *
        (TILE_HEIGHT / 2) -
      80,
  };
}

export default function RootVillagePreview({
  placedBuildings,
  height = 205,
  showCharacter = true,
  onPress,
}: RootVillagePreviewProps) {
  const {
    themeMode,
    theme,
  } = useRootTheme();

  const isCityBlack =
    themeMode ===
    'cityBlack';

  const [
    previewWidth,
    setPreviewWidth,
  ] = useState(320);

  const safeBuildings =
    Array.isArray(
      placedBuildings
    )
      ? placedBuildings.filter(
          (
            item
          ): item is PlacedBuilding =>
            Boolean(
              item &&
                typeof item ===
                  'object' &&
                typeof item.id ===
                  'string'
            )
        )
      : [];

  const scale =
    Math.max(
      0.16,
      Math.min(
        0.28,
        previewWidth / 1350,
        height / 820
      )
    );

  /*
   * 홈 마을의 중심 좌표를
   * 미리보기 중앙에 맞춥니다.
   */
  const villageCenterX = 430;
  const villageCenterY = 440;

  const mapLeft =
    previewWidth / 2 -
    MAP_WIDTH / 2 -
    scale *
      (
        villageCenterX -
        MAP_WIDTH / 2
      );

  const mapTop =
    height / 2 -
    MAP_HEIGHT / 2 -
    scale *
      (
        villageCenterY -
        MAP_HEIGHT / 2
      );

  const village = (
    <View
      onLayout={(
        event
      ) => {
        const width =
          event.nativeEvent
            .layout.width;

        if (
          width > 0 &&
          width !==
            previewWidth
        ) {
          setPreviewWidth(
            width
          );
        }
      }}
      style={[
        styles.preview,
        {
          height,

          backgroundColor:
            isCityBlack
              ? theme.card2
              : '#24345f',

          borderColor:
            isCityBlack
              ? theme.line
              : '#43558c',

          borderRadius:
            isCityBlack
              ? 4
              : 14,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.map,
          {
            left:
              mapLeft,

            top:
              mapTop,

            transform: [
              {
                scale,
              },
            ],
          },
        ]}
      >
        {Array.from({
          length:
            GRID_SIZE *
            GRID_SIZE,
        }).map(
          (
            _,
            index
          ) => {
            const row =
              Math.floor(
                index /
                  GRID_SIZE
              );

            const col =
              index %
              GRID_SIZE;

            const position =
              gridToScreen(
                col,
                row
              );

            return (
              <Image
                key={`tile-${index}`}
                source={
                  grassTile
                }
                style={[
                  styles.tile,
                  {
                    left:
                      position.x,

                    top:
                      position.y,
                  },
                ]}
              />
            );
          }
        )}

        {safeBuildings.map(
          (
            building,
            index
          ) => {
            const id =
              String(
                building.id ??
                  ''
              );

            const source =
              buildingImages[
                id
              ];

            if (!source) {
              return null;
            }

            const col =
              Number.isFinite(
                Number(
                  building.col
                )
              )
                ? Number(
                    building.col
                  )
                : 5;

            const row =
              Number.isFinite(
                Number(
                  building.row
                )
              )
                ? Number(
                    building.row
                  )
                : 5;

            const position =
              gridToScreen(
                col,
                row
              );

            const offset =
              buildingOffsets[
                id
              ] ?? {
                x: -70,
                y: -210,
              };

            const imageSize =
              buildingImageSizes[
                id
              ] ??
              360;

            const gridSize =
              buildingSizes[
                id
              ] ?? {
                cols: 1,
                rows: 1,
              };

            return (
              <Image
                key={String(
                  building.placedId ??
                    `${id}-${index}`
                )}
                source={
                  source
                }
                resizeMode="contain"
                style={{
                  position:
                    'absolute',

                  width:
                    imageSize,

                  height:
                    imageSize,

                  left:
                    position.x +
                    offset.x,

                  top:
                    position.y +
                    offset.y,

                  zIndex:
                    (
                      row +
                      col +
                      gridSize.rows
                    ) *
                    100,

                  transform: [
                    {
                      scaleX:
                        building.flipped
                          ? -1
                          : 1,
                    },
                  ],
                }}
              />
            );
          }
        )}

        {showCharacter ? (
          <Image
            source={
              foxImage
            }
            resizeMode="contain"
            style={
              styles.character
            }
          />
        ) : null}
      </View>

      {safeBuildings.length ===
      0 ? (
        <View
          pointerEvents="none"
          style={
            styles.emptyOverlay
          }
        >
          <Text
            style={
              styles.emptyIcon
            }
          >
            🏠
          </Text>

          <Text
            style={[
              styles.emptyText,
              {
                color:
                  isCityBlack
                    ? theme.text
                    : '#fff8ee',
              },
            ]}
          >
            아직 만들어진 마을이 없어요.
          </Text>
        </View>
      ) : null}

      {onPress ? (
        <View
          pointerEvents="none"
          style={[
            styles.openLabel,
            {
              backgroundColor:
                isCityBlack
                  ? theme.card
                  : 'rgba(255, 248, 238, 0.92)',

              borderColor:
                isCityBlack
                  ? theme.line
                  : '#d8b974',

              borderRadius:
                isCityBlack
                  ? 4
                  : 9,
            },
          ]}
        >
          <Text
            style={[
              styles.openLabelText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            크게 보기
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return village;
  }

  return (
    <Pressable
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => ({
        opacity:
          pressed
            ? 0.82
            : 1,
      })}
    >
      {village}
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    preview: {
      width: '100%',

      position:
        'relative',

      overflow:
        'hidden',

      borderWidth:
        0.5,
    },

    map: {
      position:
        'absolute',

      width:
        MAP_WIDTH,

      height:
        MAP_HEIGHT,
    },

    tile: {
      position:
        'absolute',

       /*
   * 배치 좌표는 190 × 95를 유지하고,
   * 실제 타일 이미지만 크게 만들어
   * 주변 타일과 살짝 겹치게 합니다.
   */
  width: 220,
  height: 110,
    },

    character: {
      position:
        'absolute',

      left: 385,
      top: 330,

      width: 110,
      height: 110,

      zIndex: 99999,
    },

    emptyOverlay: {
      ...StyleSheet.absoluteFillObject,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(0, 0, 0, 0.16)',
    },

    emptyIcon: {
      fontSize: 28,
    },

    emptyText: {
      marginTop: 6,

      fontSize: 12,
      fontWeight:
        '900',
    },

    openLabel: {
      position:
        'absolute',

      right: 9,
      bottom: 9,

      minHeight: 27,

      paddingHorizontal:
        9,

      borderWidth:
        0.5,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    openLabelText: {
      fontSize: 10,
      fontWeight:
        '900',
    },
  });
