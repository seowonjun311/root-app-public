// ROOT_EXPLORE_V11_MAP_MARKER_UI

import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getRootExplorePlaceImageUrl,
} from '../../store/rootExplorePlace';

type ClusterProps = {
  kind: 'cluster';
  count: number;
};

type PlaceProps = {
  kind: 'place';
  place: any;
  selected: boolean;
  completed: boolean;
};

type Props =
  | ClusterProps
  | PlaceProps;

export default function RootExploreMapMarker(
  props: Props
) {
  if (
    props.kind === 'cluster'
  ) {
    return (
      <View
        collapsable={false}
        renderToHardwareTextureAndroid
        style={
          styles.cluster
        }
      >
        <Text
          numberOfLines={1}
          style={
            styles.clusterText
          }
        >
          {props.count > 99
            ? '99+'
            : props.count}
        </Text>
      </View>
    );
  }

  const {
    place,
    selected,
    completed,
  } = props;

  const imageUrl =
    getRootExplorePlaceImageUrl(
      place
    );

  return (
    <View
      collapsable={false}
      renderToHardwareTextureAndroid
      style={[
        styles.photoShell,
        selected
          ? styles.photoShellSelected
          : null,
        completed
          ? styles.photoShellCompleted
          : null,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{
            uri: imageUrl,
          }}
          resizeMode="cover"
          style={
            styles.photo
          }
        />
      ) : (
        <View
          style={
            styles.fallback
          }
        >
          <Text
            style={[
              styles.fallbackIcon,
              selected
                ? styles.fallbackIconSelected
                : null,
            ]}
          >
            {String(
              place?.icon ??
                '📍'
            )}
          </Text>
        </View>
      )}

      {completed ? (
        <View
          collapsable={false}
          style={
            styles.completedBadge
          }
        >
          <Text
            style={
              styles.completedBadgeText
            }
          >
            ✓
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles =
  StyleSheet.create({
    cluster: {
      minWidth: 44,
      height: 44,
      paddingHorizontal: 9,
      borderRadius: 22,
      borderWidth: 2.5,
      borderColor: '#FFF8E8',
      backgroundColor:
        '#A87532',
      alignItems: 'center',
      justifyContent:
        'center',
      elevation: 8,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.24,
      shadowRadius: 4,
    },

    clusterText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
      textAlign: 'center',
    },

    photoShell: {
      width: 46,
      height: 46,
      padding: 2,
      borderRadius: 23,
      borderWidth: 2,
      borderColor: '#A87532',
      backgroundColor:
        '#FFF8E8',
      alignItems: 'center',
      justifyContent:
        'center',
      elevation: 7,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.22,
      shadowRadius: 3,
    },

    photoShellSelected: {
      width: 54,
      height: 54,
      borderRadius: 27,
      borderWidth: 3,
      borderColor: '#8A4D18',
      backgroundColor:
        '#FFE7AC',
      elevation: 10,
    },

    photoShellCompleted: {
      borderColor: '#3D9661',
    },

    photo: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
      backgroundColor:
        '#F5E7CE',
    },

    fallback: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
      backgroundColor:
        '#FFF8E8',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    fallbackIcon: {
      fontSize: 20,
      lineHeight: 25,
      textAlign: 'center',
    },

    fallbackIconSelected: {
      fontSize: 24,
      lineHeight: 29,
    },

    completedBadge: {
      position: 'absolute',
      top: -5,
      right: -5,
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      backgroundColor:
        '#3D9661',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    completedBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
    },
  });
