import {
  Ionicons,
} from '@expo/vector-icons';
import {
    router,
  useFocusEffect,
  useLocalSearchParams,
  } from 'expo-router';
import {
    useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  } from 'react';
import {
  InteractionManager,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
    Marker,
    type LatLng,
    type Region,
} from 'react-native-maps';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
    getExplorationDistrict,
    getExplorationPlacesByDistrict,
} from '../../../store/explorationCatalog';
import {
    loadLocalExplorationData,
    syncExplorationData,
} from '../../../store/explorationCloud';
import { useRootTheme } from '../../../store/rootTheme';
import {
    fetchSeoulCultureEvents,
    formatSeoulCultureDateLabel,
    getSeoulCultureReservationLabel,
    getSeoulCultureTypeIcon,
    getSeoulCultureTypeLabel,
    getSeoulCultureVenueTypeLabel,
    type SeoulCultureContentType,
    type SeoulCultureEvent,
} from '../../../store/seoulCultureEvents';

import RootPlacePreviewCard from '../../../components/explore/RootPlacePreviewCard';
import {
  ROOT_EXPLORE_THEME_OPTIONS,
  matchesRootExploreQuery,
  matchesRootExploreTheme,
  type RootExploreTheme,
  type RootPlaceContributionKind,
} from '../../../store/rootExplorePlace';
import RootExploreMapMarker from '../../../components/explore/RootExploreMapMarker';
import RootPlaceContributionModal from '../../../components/explore/RootPlaceContributionModal';
import {
  createEmptyRootPlaceCommunitySnapshot,
  getRootPlaceCommunityErrorMessage,
  mergeRootPlaceCommunityIntoPlace,
  pickAndUploadRootPlaceMedia,
  saveRootPlaceReport,
  subscribeRootPlaceCommunitySnapshot,
  type RootPlaceCommunitySnapshot,
  type RootPlaceReportKind,
  type RootPlaceReportSelection,
} from '../../../store/rootPlaceCommunity';
import {
  createEmptyRootPlacePublicDistrictSnapshot,
  mergeRootPlacePublicCommunityIntoPlace,
  subscribeRootPlacePublicCommunityDistrict,
  type RootPlacePublicDistrictSnapshot,
} from '../../../store/rootPlacePublicCommunity';

// ROOT_EXPLORE_V12C_PUBLIC_DISTRICT_HYDRATION

// ROOT_EXPLORE_V12B_OWN_PENDING_DISTRICT_HYDRATION

// ROOT_EXPLORE_V12A_COMMUNITY_INTEGRATION
import {
  buildRootExploreMapRenderItems,
  getRootExploreMapMarkerMode,
} from '../../../store/rootExploreMapCluster';

// ROOT_EXPLORE_V1_COMMON_PLACE_DISTRICT_INTEGRATION
// ROOT_EXPLORE_V11_CLUSTER_PHOTO_MARKER_INTEGRATION

type PlaceFilter =
  | 'all'
  | 'unvisited'
  | 'visited';

type DistrictContentMode =
  | 'places'
  | 'events'
  | 'facilities';

type DistrictMapType =
  | 'standard'
  | 'terrain'
  | 'satellite';

type DistrictEventTypeFilter =
  | 'all'
  | SeoulCultureContentType;

type PlaceWithCoordinate = {
  place: any;
  coordinate: LatLng | null;
};

type EventWithCoordinate = {
  event: SeoulCultureEvent;
  coordinate: LatLng;
};

type DistrictFacilityCategoryFilter =
  | 'all'
  | 'camping'
  | 'sports'
  | 'space'
  | 'education';

type DistrictFacilityStatus =
  | 'open'
  | 'scheduled'
  | 'paused'
  | 'closed'
  | 'unknown';

type DistrictFacilityItem = {
  id: string;
  sourceId: string;
  kind:
    | 'camping'
    | 'sports'
    | 'space'
    | 'education';
  name: string;
  icon: string;
  district: string;
  categoryLabel: string;
  paidType: string;
  reservationCount: number;
  status: DistrictFacilityStatus;
  statusLabel: string;
  coordinate: LatLng | null;
  receptionText: string;
  primaryTitle: string;
  reservationUrl: string;
};

type FacilityWithCoordinate = {
  item: DistrictFacilityItem;
  coordinate: LatLng;
};

const DISTRICT_CONTENT_OPTIONS: readonly {
  id: DistrictContentMode;
  label: string;
}[] = [
  {
    id: 'places',
    label: '탐험장소',
  },
  {
    id: 'events',
    label: '축제·행사',
  },
  {
    id: 'facilities',
    label: '예약·시설',
  },
];

const DISTRICT_FACILITY_CATEGORY_OPTIONS: readonly {
  id: DistrictFacilityCategoryFilter;
  label: string;
}[] = [
  {
    id: 'all',
    label: '전체',
  },
  {
    id: 'camping',
    label: '캠핑·피크닉',
  },
  {
    id: 'sports',
    label: '체육시설',
  },
  {
    id: 'space',
    label: '공간대관',
  },
  {
    id: 'education',
    label: '교육·체험',
  },
];

const DISTRICT_MAP_TYPE_OPTIONS: readonly {
  id: DistrictMapType;
  label: string;
}[] = [
  {
    id: 'standard',
    label: 'ROOT',
  },
  {
    id: 'terrain',
    label: '지형',
  },
  {
    id: 'satellite',
    label: '위성',
  },
];

const DISTRICT_MAP_FAST_MOUNT_DELAY_MS =
  120;

const DISTRICT_INITIAL_PLACE_LIST_COUNT =
  6;

const DISTRICT_SECOND_PLACE_LIST_COUNT =
  18;

const DISTRICT_PLACE_LIST_SECOND_BATCH_DELAY_MS =
  160;

const DISTRICT_PLACE_LIST_FINAL_BATCH_DELAY_MS =
  700;

const DISTRICT_INITIAL_MARKER_COUNT =
  8;

const DISTRICT_SECOND_MARKER_COUNT =
  18;

const DISTRICT_MARKER_SECOND_BATCH_DELAY_MS =
  80;

const DISTRICT_MARKER_FINAL_BATCH_DELAY_MS =
  260;

const PLACE_FILTER_OPTIONS: readonly {
  id: PlaceFilter;
  label: string;
}[] = [
  {
    id: 'all',
    label: '전체',
  },
  {
    id: 'unvisited',
    label: '미방문',
  },
  {
    id: 'visited',
    label: '방문 완료',
  },
];

const EVENT_TYPE_FILTER_OPTIONS: readonly {
  id: DistrictEventTypeFilter;
  label: string;
}[] = [
  {
    id: 'all',
    label: '전체',
  },
  {
    id: 'festival',
    label: '축제',
  },
  {
    id: 'performance',
    label: '공연',
  },
  {
    id: 'exhibition',
    label: '전시',
  },
  {
    id: 'experience',
    label: '체험',
  },
];

const ROOT_WARM_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [
      {
        color: '#F4E8CF',
      },
    ],
  },
  {
    elementType: 'labels.icon',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#6B4A2B',
      },
    ],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [
      {
        color: '#FFF8E9',
      },
      {
        weight: 2,
      },
    ],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [
      {
        color: '#CDAA6D',
      },
    ],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [
      {
        color: '#F1E4C9',
      },
    ],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [
      {
        color: '#EADDBE',
      },
    ],
  },
  {
    featureType: 'poi.business',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'poi.medical',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [
      {
        color: '#DCE7C5',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [
      {
        color: '#FFF9ED',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [
      {
        color: '#D8B778',
      },
    ],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [
      {
        color: '#E7C678',
      },
    ],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [
      {
        color: '#C89B50',
      },
    ],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [
      {
        color: '#C8B89D',
      },
    ],
  },
  {
    featureType: 'transit.station',
    stylers: [
      {
        visibility: 'simplified',
      },
    ],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [
      {
        color: '#B8DCE4',
      },
    ],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#477C86',
      },
    ],
  },
];

const SEOUL_DISTRICT_FALLBACK_REGIONS: Record<
  string,
  Region
> = {
  gangnam: {
    latitude: 37.5172,
    longitude: 127.0473,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  },
  gangdong: {
    latitude: 37.5301,
    longitude: 127.1238,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  },
  gangbuk: {
    latitude: 37.6396,
    longitude: 127.0257,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  },
  gangseo: {
    latitude: 37.5509,
    longitude: 126.8495,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  },
  gwanak: {
    latitude: 37.4784,
    longitude: 126.9516,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  },
  gwangjin: {
    latitude: 37.5385,
    longitude: 127.0823,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
  guro: {
    latitude: 37.4955,
    longitude: 126.8877,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  },
  geumcheon: {
    latitude: 37.4569,
    longitude: 126.8955,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
  nowon: {
    latitude: 37.6542,
    longitude: 127.0568,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  },
  dobong: {
    latitude: 37.6688,
    longitude: 127.0471,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  },
  dongdaemun: {
    latitude: 37.5744,
    longitude: 127.0396,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
  dongjak: {
    latitude: 37.5124,
    longitude: 126.9393,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
  mapo: {
    latitude: 37.5663,
    longitude: 126.9019,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  },
  seodaemun: {
    latitude: 37.5791,
    longitude: 126.9368,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
  seocho: {
    latitude: 37.4837,
    longitude: 127.0324,
    latitudeDelta: 0.11,
    longitudeDelta: 0.11,
  },
  seongdong: {
    latitude: 37.5634,
    longitude: 127.0369,
    latitudeDelta: 0.085,
    longitudeDelta: 0.085,
  },
  seongbuk: {
    latitude: 37.5894,
    longitude: 127.0167,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  },
  songpa: {
    latitude: 37.5145,
    longitude: 127.1059,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  },
  yangcheon: {
    latitude: 37.5169,
    longitude: 126.8665,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
  yeongdeungpo: {
    latitude: 37.5264,
    longitude: 126.8963,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  },
  yongsan: {
    latitude: 37.5326,
    longitude: 126.9906,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
  eunpyeong: {
    latitude: 37.6027,
    longitude: 126.9291,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  },
  jongno: {
    latitude: 37.5735,
    longitude: 126.979,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  },
  jung: {
    latitude: 37.5641,
    longitude: 126.9979,
    latitudeDelta: 0.07,
    longitudeDelta: 0.07,
  },
  jungnang: {
    latitude: 37.6063,
    longitude: 127.0927,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
};

function getNumber(
  value: unknown
): number | null {
  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : null;
}

function getPlaceCoordinate(
  place: any
): LatLng | null {
  const latitude =
    getNumber(place?.mapLatitude) ??
    getNumber(place?.latitude) ??
    getNumber(place?.lat);

  const longitude =
    getNumber(place?.mapLongitude) ??
    getNumber(place?.longitude) ??
    getNumber(place?.lng) ??
    getNumber(place?.lon);

  if (
    latitude !== null &&
    longitude !== null
  ) {
    return {
      latitude,
      longitude,
    };
  }

  const verificationPoints =
    Array.isArray(
      place?.verificationPoints
    )
      ? place.verificationPoints
      : [];

  for (
    const point of verificationPoints
  ) {
    const pointLatitude =
      getNumber(point?.latitude) ??
      getNumber(point?.lat);

    const pointLongitude =
      getNumber(point?.longitude) ??
      getNumber(point?.lng) ??
      getNumber(point?.lon);

    if (
      pointLatitude !== null &&
      pointLongitude !== null
    ) {
      return {
        latitude: pointLatitude,
        longitude: pointLongitude,
      };
    }
  }

  return null;
}

function getFallbackRegion(
  districtId: string
): Region {
  return (
    SEOUL_DISTRICT_FALLBACK_REGIONS[
      districtId
    ] ?? {
      latitude: 37.5665,
      longitude: 126.978,
      latitudeDelta: 0.22,
      longitudeDelta: 0.22,
    }
  );
}

function getRegionFromCoordinates(
  coordinates: readonly LatLng[],
  fallbackRegion: Region
): Region {
  if (coordinates.length === 0) {
    return fallbackRegion;
  }

  const latitudes =
    coordinates.map(
      (item) => item.latitude
    );

  const longitudes =
    coordinates.map(
      (item) => item.longitude
    );

  const minLatitude =
    Math.min(...latitudes);
  const maxLatitude =
    Math.max(...latitudes);
  const minLongitude =
    Math.min(...longitudes);
  const maxLongitude =
    Math.max(...longitudes);

  return {
    latitude:
      (minLatitude + maxLatitude) / 2,
    longitude:
      (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max(
      0.025,
      (maxLatitude - minLatitude) *
        1.55
    ),
    longitudeDelta: Math.max(
      0.025,
      (maxLongitude - minLongitude) *
        1.55
    ),
  };
}

function normalizeDistrictName(
  value: string
) {
  return value
    .replace(/서울특별시/g, '')
    .replace(/서울시/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function getPlaceMetaText(
  place: any
) {
  return [
    place?.category,
    place?.areaType,
  ]
    .map((value) =>
      String(value ?? '').trim()
    )
    .filter(Boolean)
    .join(' · ');
}

function getPlaceLocationText(
  place: any,
  districtName: string
) {
  return (
    String(
      place?.address ??
        place?.locationText ??
        place?.placeAddress ??
        place?.districtName ??
        districtName
    ).trim() || districtName
  );
}

function getEventCoordinate(
  event: SeoulCultureEvent
): LatLng | null {
  if (
    event.latitude == null ||
    event.longitude == null
  ) {
    return null;
  }

  return {
    latitude: event.latitude,
    longitude: event.longitude,
  };
}

function getEventStatusLabel(
  event: SeoulCultureEvent
) {
  const now = new Date();
  const start = new Date(
    `${event.startDate}T00:00:00+09:00`
  );
  const end = new Date(
    `${event.endDate}T23:59:59+09:00`
  );

  if (now.getTime() < start.getTime()) {
    return '예정';
  }

  if (now.getTime() <= end.getTime()) {
    return '진행 중';
  }

  return '종료';
}

function isCurrentOrUpcomingEvent(
  event: SeoulCultureEvent
) {
  const end = new Date(
    `${event.endDate}T23:59:59+09:00`
  );

  return (
    end.getTime() >= Date.now()
  );
}

export default function DistrictMapScreen() {
  const {
    districtId: rawDistrictId,
  } = useLocalSearchParams<{
    districtId?: string | string[];
  }>();

  const districtId =
    Array.isArray(rawDistrictId)
      ? String(rawDistrictId[0] ?? '')
      : String(rawDistrictId ?? '');

  const normalizedDistrictId =
    districtId.trim();

  const insets =
    useSafeAreaInsets();

  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const mapRef =
    useRef<MapView | null>(null);

  const districtMapStartedAtRef =
    useRef(Date.now());

  const skipInitialMapFitRef =
    useRef(true);

  const [loading, setLoading] =
    useState(true);

  const [
    completedPlaceIds,
    setCompletedPlaceIds,
  ] = useState<string[]>([]);

  const [
    selectedPlaceId,
    setSelectedPlaceId,
  ] = useState<string | null>(
    null
  );

  const [
    selectedEventId,
    setSelectedEventId,
  ] = useState<string | null>(
    null
  );

  const [
    selectedFacilityId,
    setSelectedFacilityId,
  ] = useState<string | null>(
    null
  );

  const [
    contentMode,
    setContentMode,
  ] = useState<DistrictContentMode>(
    'places'
  );

  const [
    facilityCategoryFilter,
    setFacilityCategoryFilter,
  ] =
    useState<DistrictFacilityCategoryFilter>(
      'all'
    );

  const [
    selectedFilter,
    setSelectedFilter,
  ] = useState<PlaceFilter>(
    'all'
  );
  const [
    rootPlaceReportDraft,
    setRootPlaceReportDraft,
  ] = useState<{
    place: any;
    kind:
      RootPlaceReportKind;
  } | null>(
    null
  );

  const [
    rootPlaceCommunityBusy,
    setRootPlaceCommunityBusy,
  ] = useState(false);

  const [
    rootPlaceCommunitySnapshot,
    setRootPlaceCommunitySnapshot,
  ] = useState<
    RootPlaceCommunitySnapshot
  >(
    () =>
      createEmptyRootPlaceCommunitySnapshot()
  );

  const [
    rootPlacePublicSnapshot,
    setRootPlacePublicSnapshot,
  ] = useState<
    RootPlacePublicDistrictSnapshot
  >(
    () =>
      createEmptyRootPlacePublicDistrictSnapshot(
        normalizedDistrictId
      )
  );

  const [
    selectedThemeFilter,
    setSelectedThemeFilter,
  ] = useState<RootExploreTheme>(
    'all'
  );

  const [
    placeSearchQuery,
    setPlaceSearchQuery,
  ] = useState('');


  const [
    eventTypeFilter,
    setEventTypeFilter,
  ] =
    useState<DistrictEventTypeFilter>(
      'all'
    );

  const [
    districtMapType,
    setDistrictMapType,
  ] = useState<DistrictMapType>(
    'standard'
  );

  const [
    mapReady,
    setMapReady,
  ] = useState(false);

  const [
    mapRegion,
    setMapRegion,
  ] = useState<Region | null>(
    null
  );

  const [
    districtMapMounted,
    setDistrictMapMounted,
  ] = useState(false);

  const [
    placeMarkerRenderCount,
    setPlaceMarkerRenderCount,
  ] = useState(0);

  const [
    placeListRenderCount,
    setPlaceListRenderCount,
  ] = useState(
    DISTRICT_INITIAL_PLACE_LIST_COUNT
  );

  const [
    trackMarkerChanges,
    setTrackMarkerChanges,
  ] = useState(true);

  const [
    seoulCultureEvents,
    setSeoulCultureEvents,
  ] = useState<
    SeoulCultureEvent[]
  >([]);

  const [
    eventLoading,
    setEventLoading,
  ] = useState(false);

  const [
    eventLoaded,
    setEventLoaded,
  ] = useState(false);

  const [
    eventError,
    setEventError,
  ] = useState<string | null>(
    null
  );

  useFocusEffect(
    useCallback(
      () => {
        let active =
          true;

        const unsubscribe =
          subscribeRootPlaceCommunitySnapshot({
            onChange:
              (
                snapshot
              ) => {
                if (
                  active
                ) {
                  setRootPlaceCommunitySnapshot(
                    snapshot
                  );
                }
              },
            onError:
              (
                error
              ) => {
                console.log(
                  'ROOT PLACE COMMUNITY HYDRATION ERROR',
                  error
                );
              },
          });

        return () => {
          active =
            false;

          unsubscribe();
        };
      },
      []
    )
  );

  useFocusEffect(
    useCallback(
      () => {
        let active =
          true;

        setRootPlacePublicSnapshot(
          createEmptyRootPlacePublicDistrictSnapshot(
            normalizedDistrictId
          )
        );

        const unsubscribe =
          subscribeRootPlacePublicCommunityDistrict({
            districtId:
              normalizedDistrictId,
            onChange:
              (
                snapshot
              ) => {
                if (
                  active
                ) {
                  setRootPlacePublicSnapshot(
                    snapshot
                  );
                }
              },
            onError:
              (
                error
              ) => {
                console.log(
                  'ROOT PUBLIC PLACE COMMUNITY HYDRATION ERROR',
                  error
                );

                if (
                  active
                ) {
                  setRootPlacePublicSnapshot(
                    createEmptyRootPlacePublicDistrictSnapshot(
                      normalizedDistrictId
                    )
                  );
                }
              },
          });

        return () => {
          active =
            false;

          unsubscribe();
        };
      },
      [
        normalizedDistrictId,
      ]
    )
  );

  const district = useMemo(
    () =>
      getExplorationDistrict(
        normalizedDistrictId
      ),
    [normalizedDistrictId]
  );

  const places = useMemo(
    () =>
      getExplorationPlacesByDistrict(
        normalizedDistrictId
      ),
    [normalizedDistrictId]
  );

  const districtName =
    String(
      district?.name ??
        normalizedDistrictId ??
        '지역'
    ).trim() || '지역';

  const publicCommunityPlaces =
    useMemo(
      () =>
        places.map(
          (place) =>
            mergeRootPlacePublicCommunityIntoPlace(
              place,
              rootPlacePublicSnapshot
            )
        ),
      [
        places,
        rootPlacePublicSnapshot,
      ]
    );

  const communityPlaces =
    useMemo(
      () =>
        publicCommunityPlaces.map(
          (place) =>
            mergeRootPlaceCommunityIntoPlace(
              place,
              rootPlaceCommunitySnapshot
            )
        ),
      [
        publicCommunityPlaces,
        rootPlaceCommunitySnapshot,
      ]
    );

  const matchesCurrentRootPlaceFilters =
    useCallback(
      (place: any) => {
        const completed =
          completedPlaceIds.includes(
            String(
              place?.id ?? ''
            )
          );

        if (
          selectedFilter ===
          'visited' &&
          !completed
        ) {
          return false;
        }

        if (
          selectedFilter ===
          'unvisited' &&
          completed
        ) {
          return false;
        }

        return (
          matchesRootExploreQuery(
            place,
            placeSearchQuery
          ) &&
          matchesRootExploreTheme(
            place,
            selectedThemeFilter
          )
        );
      },
      [
        completedPlaceIds,
        placeSearchQuery,
        selectedFilter,
        selectedThemeFilter,
      ]
    );

  const placesWithCoordinates =
    useMemo<PlaceWithCoordinate[]>(
      () =>
        communityPlaces.map((place) => ({
          place,
          coordinate:
            getPlaceCoordinate(place),
        })),
      [
        communityPlaces,
      ]
    );

  const markerItems = useMemo(
    () =>
      placesWithCoordinates
        .filter(
          (
            item
          ): item is {
            place: any;
            coordinate: LatLng;
          } =>
            item.coordinate !== null
        )
        .filter(({ place }) =>
          matchesCurrentRootPlaceFilters(
            place
          )
        ),
    [
      matchesCurrentRootPlaceFilters,
      placesWithCoordinates,
    ]
  );

  const districtEvents = useMemo(
    () => {
      const normalizedTarget =
        normalizeDistrictName(
          districtName
        );

      return seoulCultureEvents
        .filter(
          (event) =>
            normalizeDistrictName(
              event.districtName
            ) === normalizedTarget
        )
        .filter(
          isCurrentOrUpcomingEvent
        )
        .sort(
          (first, second) => {
            const firstActive =
              getEventStatusLabel(
                first
              ) === '진행 중';

            const secondActive =
              getEventStatusLabel(
                second
              ) === '진행 중';

            if (
              firstActive !== secondActive
            ) {
              return firstActive
                ? -1
                : 1;
            }

            return (
              new Date(
                `${first.startDate}T00:00:00+09:00`
              ).getTime() -
              new Date(
                `${second.startDate}T00:00:00+09:00`
              ).getTime()
            );
          }
        );
    },
    [
      districtName,
      seoulCultureEvents,
    ]
  );

  const filteredDistrictEvents =
    useMemo(
      () =>
        districtEvents.filter(
          (event) =>
            eventTypeFilter ===
              'all' ||
            event.contentType ===
              eventTypeFilter
        ),
      [
        districtEvents,
        eventTypeFilter,
      ]
    );

  const eventMarkerItems =
    useMemo<EventWithCoordinate[]>(
      () =>
        filteredDistrictEvents
          .map((event) => ({
            event,
            coordinate:
              getEventCoordinate(
                event
              ),
          }))
          .filter(
            (
              item
            ): item is EventWithCoordinate =>
              item.coordinate !== null
          ),
      [filteredDistrictEvents]
    );

  const districtCampingFacilityItems =
    useMemo<DistrictFacilityItem[]>(
      () => [],
      []
    );

  const districtSportsFacilityItems =
    useMemo<DistrictFacilityItem[]>(
      () => [],
      []
    );

  const districtSpaceFacilityItems =
    useMemo<DistrictFacilityItem[]>(
      () => [],
      []
    );

  const districtEducationFacilityItems =
    useMemo<DistrictFacilityItem[]>(
      () => [],
      []
    );

  const districtFacilityItems =
    useMemo<DistrictFacilityItem[]>(
      () => [],
      []
    );

  const facilityMarkerItems =
    useMemo<FacilityWithCoordinate[]>(
      () => [],
      []
    );
  const visitedCount =
    useMemo(
      () =>
        places.filter((place) =>
          completedPlaceIds.includes(
            String(place?.id ?? '')
          )
        ).length,
      [
        completedPlaceIds,
        places,
      ]
    );

  const filteredPlaces =
    useMemo(
      () =>
        communityPlaces.filter(
          matchesCurrentRootPlaceFilters
        ),
      [
        communityPlaces,
        matchesCurrentRootPlaceFilters,
      ]
    );

  const visiblePlaceMarkerItems =
    useMemo(
      () =>
        markerItems.slice(
          0,
          placeMarkerRenderCount
        ),
      [
        markerItems,
        placeMarkerRenderCount,
      ]
    );

  const visibleFilteredPlaces =
    useMemo(
      () =>
        filteredPlaces.slice(
          0,
          placeListRenderCount
        ),
      [
        filteredPlaces,
        placeListRenderCount,
      ]
    );

  const selectedPlace =
    useMemo(
      () =>
        communityPlaces.find(
          (place) =>
            String(place?.id ?? '') ===
            selectedPlaceId
        ) ?? null,
      [
        communityPlaces,
        selectedPlaceId,
      ]
    );

  const selectedEvent =
    useMemo(
      () =>
        districtEvents.find(
          (event) =>
            event.id ===
            selectedEventId
        ) ?? null,
      [
        districtEvents,
        selectedEventId,
      ]
    );

  const selectedFacilityItem =
    useMemo(
      () =>
        districtFacilityItems.find(
          (item) =>
            item.id ===
            selectedFacilityId
        ) ?? null,
      [
        districtFacilityItems,
        selectedFacilityId,
      ]
    );

  const fallbackRegion =
    useMemo(
      () =>
        getFallbackRegion(
          normalizedDistrictId
        ),
      [normalizedDistrictId]
    );

  const displayedCoordinates =
    useMemo(
      () => {
        if (
          contentMode === 'events'
        ) {
          return eventMarkerItems.map(
            (item) =>
              item.coordinate
          );
        }

        if (
          contentMode === 'places'
        ) {
          return markerItems.map(
            (item) =>
              item.coordinate
          );
        }

        if (
          contentMode === 'facilities'
        ) {
          return facilityMarkerItems.map(
            (item) =>
              item.coordinate
          );
        }

        return [];
      },
      [
        contentMode,
        eventMarkerItems,
        facilityMarkerItems,
        markerItems,
      ]
    );

  const initialRegion =
    useMemo(
      () =>
        getRegionFromCoordinates(
          displayedCoordinates,
          fallbackRegion
        ),
      [
        displayedCoordinates,
        fallbackRegion,
      ]
    );

  const rootExploreMapRegion =
    mapRegion ??
    initialRegion;

  const rootExploreMarkerMode =
    getRootExploreMapMarkerMode(
      rootExploreMapRegion
    );

  const rootExploreMapRenderItems =
    useMemo(
      () =>
        buildRootExploreMapRenderItems(
          rootExploreMarkerMode ===
          'cluster'
            ? markerItems
            : visiblePlaceMarkerItems,
          rootExploreMapRegion
        ),
      [
        markerItems,
        rootExploreMapRegion,
        rootExploreMarkerMode,
        visiblePlaceMarkerItems,
      ]
    );

  const zoomIntoRootExploreCluster =
    useCallback(
      (coordinate: LatLng) => {
        const currentRegion =
          mapRegion ??
          initialRegion;

        const latitudeDelta =
          Math.max(
            currentRegion.latitudeDelta *
              0.42,
            0.012
          );

        const longitudeDelta =
          Math.max(
            currentRegion.longitudeDelta *
              0.42,
            0.012
          );

        mapRef.current?.animateToRegion(
          {
            latitude:
              coordinate.latitude,
            longitude:
              coordinate.longitude,
            latitudeDelta,
            longitudeDelta,
          },
          260
        );
      },
      [
        initialRegion,
        mapRegion,
      ]
    );

  const applyExplorationData =
    useCallback(
      (data: any) => {
        const nextVisited =
          Array.isArray(
            data?.visitedPlaceIds
          )
            ? data.visitedPlaceIds
                .map(
                  (id: unknown) =>
                    String(
                      id ?? ''
                    ).trim()
                )
                .filter(Boolean)
            : [];

        setCompletedPlaceIds(
          Array.from(
            new Set(nextVisited)
          )
        );
      },
      []
    );

  const loadDistrictEvents =
    useCallback(
      async (
        forceRefresh = false
      ) => {
        try {
          setEventLoading(true);
          setEventError(null);

          const result =
            await fetchSeoulCultureEvents(
              {
                forceRefresh,
              }
            );

          setSeoulCultureEvents(
            result.events
          );

          setEventLoaded(true);
        } catch (error) {
          console.log(
            'DISTRICT CULTURE LOAD ERROR',
            error
          );

          setEventError(
            error instanceof Error
              ? error.message
              : '문화행사를 불러오지 못했어요.'
          );
        } finally {
          setEventLoading(false);
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      let backgroundDelay:
        ReturnType<typeof setTimeout> | null =
          null;

      const loadLocal =
        async () => {
          setLoading(true);

          try {
            const local =
              await loadLocalExplorationData();

            if (active) {
              applyExplorationData(
                local
              );
            }
          } catch (error) {
            console.log(
              'DISTRICT MAP LOCAL LOAD ERROR',
              error
            );
          } finally {
            if (active) {
              setLoading(false);
            }
          }
        };

      void loadLocal();

      const interactionTask =
        InteractionManager.runAfterInteractions(
          () => {
            backgroundDelay =
              setTimeout(
                () => {
                  if (!active) {
                    return;
                  }

                  console.log(
                    'DISTRICT MAP BACKGROUND SYNC START'
                  );

                  void syncExplorationData()
                    .then(
                      (synced) => {
                        if (active) {
                          applyExplorationData(
                            synced
                          );
                        }
                      }
                    )
                    .catch(
                      (error) => {
                        console.log(
                          'DISTRICT MAP BACKGROUND SYNC ERROR',
                          error
                        );
                      }
                    );
                },
                24 * 60 * 60 * 1_000
              );
          }
        );

      return () => {
        active = false;

        interactionTask.cancel?.();

        if (backgroundDelay) {
          clearTimeout(
            backgroundDelay
          );
        }
      };
    }, [applyExplorationData])
  );

  useEffect(() => {
    districtMapStartedAtRef.current =
      Date.now();

    skipInitialMapFitRef.current =
      true;

    setDistrictMapMounted(false);
    setMapReady(false);
    setMapRegion(null);
    setPlaceMarkerRenderCount(0);

    setPlaceListRenderCount(
      Math.min(
        DISTRICT_INITIAL_PLACE_LIST_COUNT,
        filteredPlaces.length
      )
    );

    if (!normalizedDistrictId) {
      return;
    }

    console.log(
      'DISTRICT INITIAL UI READY',
      {
        districtId:
          normalizedDistrictId,
      }
    );

    const mapMountTimer =
      setTimeout(
        () => {
          console.log(
            'DISTRICT MAP FAST MOUNT START',
            {
              districtId:
                normalizedDistrictId,
              elapsedMs:
                Date.now() -
                districtMapStartedAtRef.current,
            }
          );

          setDistrictMapMounted(
            true
          );
        },
        DISTRICT_MAP_FAST_MOUNT_DELAY_MS
      );

    return () => {
      clearTimeout(
        mapMountTimer
      );
    };
  }, [
    normalizedDistrictId,
  ]);

  useEffect(() => {
    if (
      contentMode !== 'places'
    ) {
      return;
    }

    setPlaceListRenderCount(
      Math.min(
        DISTRICT_INITIAL_PLACE_LIST_COUNT,
        filteredPlaces.length
      )
    );

    if (!mapReady) {
      return;
    }

    const secondListTimer =
      setTimeout(
        () => {
          setPlaceListRenderCount(
            Math.min(
              DISTRICT_SECOND_PLACE_LIST_COUNT,
              filteredPlaces.length
            )
          );
        },
        DISTRICT_PLACE_LIST_SECOND_BATCH_DELAY_MS
      );

    const finalListTimer =
      setTimeout(
        () => {
          setPlaceListRenderCount(
            filteredPlaces.length
          );

          console.log(
            'DISTRICT PLACE LIST READY',
            {
              count:
                filteredPlaces.length,
              districtId:
                normalizedDistrictId,
            }
          );
        },
        DISTRICT_PLACE_LIST_FINAL_BATCH_DELAY_MS
      );

    return () => {
      clearTimeout(
        secondListTimer
      );

      clearTimeout(
        finalListTimer
      );
    };
  }, [
    contentMode,
    filteredPlaces.length,
    mapReady,
    normalizedDistrictId,
  ]);

  useEffect(() => {
    if (
      !districtMapMounted ||
      !mapReady ||
      contentMode !== 'places'
    ) {
      setPlaceMarkerRenderCount(
        0
      );

      return;
    }

    setPlaceMarkerRenderCount(
      Math.min(
        DISTRICT_INITIAL_MARKER_COUNT,
        markerItems.length
      )
    );

    const secondMarkerTimer =
      setTimeout(
        () => {
          setPlaceMarkerRenderCount(
            Math.min(
              DISTRICT_SECOND_MARKER_COUNT,
              markerItems.length
            )
          );
        },
        DISTRICT_MARKER_SECOND_BATCH_DELAY_MS
      );

    const finalMarkerTimer =
      setTimeout(
        () => {
          setPlaceMarkerRenderCount(
            markerItems.length
          );

          console.log(
            'DISTRICT PLACE MARKERS READY',
            {
              count:
                markerItems.length,
              districtId:
                normalizedDistrictId,
            }
          );
        },
        DISTRICT_MARKER_FINAL_BATCH_DELAY_MS
      );

    return () => {
      clearTimeout(
        secondMarkerTimer
      );

      clearTimeout(
        finalMarkerTimer
      );
    };
  }, [
    contentMode,
    districtMapMounted,
    mapReady,
    markerItems.length,
    normalizedDistrictId,
  ]);

  useEffect(() => {
    if (
      contentMode === 'events' &&
      !eventLoaded &&
      !eventLoading
    ) {
      void loadDistrictEvents();
    }
  }, [
    contentMode,
    eventLoaded,
    eventLoading,
    loadDistrictEvents,
  ]);

  useEffect(() => {
    setSelectedPlaceId(null);
    setSelectedEventId(null);
    setSelectedFacilityId(null);
  }, [contentMode]);

  useEffect(() => {
    if (
      !mapReady ||
      displayedCoordinates.length ===
        0
    ) {
      return;
    }

    if (
      skipInitialMapFitRef.current
    ) {
      skipInitialMapFitRef.current =
        false;

      return;
    }

    const timeoutId =
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          displayedCoordinates,
          {
            edgePadding: {
              top: 70,
              right: 45,
              bottom: 70,
              left: 45,
            },
            animated: true,
          }
        );
      }, 120);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    contentMode,
    displayedCoordinates,
    mapReady,
  ]);

  useEffect(() => {
    setTrackMarkerChanges(true);

    const timeoutId =
      setTimeout(() => {
        setTrackMarkerChanges(false);
      },
      contentMode === 'places' &&
      rootExploreMarkerMode ===
        'photo'
        ? 1_200
        : 300
      );

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    contentMode,
    districtMapType,
    selectedPlaceId,
    selectedEventId,
    selectedFacilityId,
    completedPlaceIds,
    markerItems.length,
    eventMarkerItems.length,
    facilityMarkerItems.length,
    rootExploreMarkerMode,
    rootPlaceCommunitySnapshot
      .revision,
    rootPlacePublicSnapshot
      .revision,
  ]);

  const openRootPlaceDirections =
    useCallback(
      async (place: any) => {
        const coordinate =
          getPlaceCoordinate(
            place
          );

        if (!coordinate) {
          Alert.alert(
            '길찾기',
            '아직 이 장소의 지도 좌표가 준비되지 않았어요.'
          );
          return;
        }

        const url =
          'https://www.google.com/maps/search/?api=1&query=' +
          coordinate.latitude +
          ',' +
          coordinate.longitude;

        try {
          await Linking.openURL(
            url
          );
        } catch (error) {
          console.log(
            'ROOT PLACE DIRECTIONS OPEN ERROR',
            error
          );

          Alert.alert(
            '길찾기',
            '지도 앱을 열지 못했어요.'
          );
        }
      },
      []
    );

  const shareRootPlace =
    useCallback(
      async (place: any) => {
        const name =
          String(
            place?.name ??
              'ROOT 탐험 장소'
          ).trim();

        const location =
          getPlaceLocationText(
            place,
            districtName
          );

        try {
          await Share.share({
            message:
              name +
              '\n' +
              location +
              '\nROOT에서 발견한 탐험 장소예요.',
          });
        } catch (error) {
          console.log(
            'ROOT PLACE SHARE ERROR',
            error
          );
        }
      },
      [districtName]
    );

  const showRootPlaceSaveFoundationNotice =
    useCallback(
      () => {
        Alert.alert(
          '장소 저장',
          '장소 저장은 기존 ROOT 저장 장소 시스템과 연결하는 단계에서 통합할 예정이에요.'
        );
      },
      []
    );

  const showRootPlaceCommunityError =
    useCallback(
      (
        title: string,
        error: unknown
      ) => {
        console.log(
          'ROOT PLACE COMMUNITY ERROR',
          error
        );

        Alert.alert(
          title,
          getRootPlaceCommunityErrorMessage(
            error
          )
        );
      },
      []
    );

  const handleRootPlaceContribution =
    useCallback(
      async (
        place: any,
        kind:
          RootPlaceContributionKind
      ) => {
        if (
          rootPlaceCommunityBusy
        ) {
          return;
        }

        if (
          kind ===
          'photo'
        ) {
          try {
            setRootPlaceCommunityBusy(
              true
            );

            const result =
              await pickAndUploadRootPlaceMedia(
                place
              );

            if (
              result.canceled
            ) {
              return;
            }

            const mediaType =
              result
                .record
                .media
                ?.mediaType;

            Alert.alert(
              mediaType ===
                'video'
                ? '동영상 업로드 완료'
                : '사진 업로드 완료',
              '검수 대기 상태로 저장했어요. V1.2B에서 최근 현장사진을 지도 마커와 장소 카드에 바로 반영합니다.'
            );
          } catch (error) {
            showRootPlaceCommunityError(
              '미디어 업로드 실패',
              error
            );
          } finally {
            setRootPlaceCommunityBusy(
              false
            );
          }

          return;
        }

        setRootPlaceReportDraft({
          place,
          kind,
        });
      },
      [
        rootPlaceCommunityBusy,
        showRootPlaceCommunityError,
      ]
    );

  const submitRootPlaceReport =
    useCallback(
      async (
        selection:
          RootPlaceReportSelection
      ) => {
        const draft =
          rootPlaceReportDraft;

        if (
          !draft ||
          rootPlaceCommunityBusy
        ) {
          return;
        }

        try {
          setRootPlaceCommunityBusy(
            true
          );

          await saveRootPlaceReport({
            place:
              draft.place,
            kind:
              draft.kind,
            selection,
          });

          setRootPlaceReportDraft(
            null
          );

          Alert.alert(
            '제보 저장 완료',
            '현장 정보를 검수 대기 상태로 저장했어요. 장소의 공식 정보는 즉시 덮어쓰지 않습니다.'
          );
        } catch (error) {
          showRootPlaceCommunityError(
            '제보 저장 실패',
            error
          );
        } finally {
          setRootPlaceCommunityBusy(
            false
          );
        }
      },
      [
        rootPlaceCommunityBusy,
        rootPlaceReportDraft,
        showRootPlaceCommunityError,
      ]
    );

  const focusPlace =
    useCallback(
      (
        place: any,
        coordinate: LatLng | null
      ) => {
        const placeId =
          String(place?.id ?? '');

        setSelectedPlaceId(
          placeId || null
        );

        if (!coordinate) {
          return;
        }

        mapRef.current?.animateToRegion(
          {
            latitude:
              coordinate.latitude,
            longitude:
              coordinate.longitude,
            latitudeDelta: 0.018,
            longitudeDelta: 0.018,
          },
          350
        );
      },
      []
    );

  const focusEvent =
    useCallback(
      (
        event: SeoulCultureEvent,
        coordinate: LatLng | null
      ) => {
        setSelectedEventId(
          event.id
        );

        if (!coordinate) {
          return;
        }

        mapRef.current?.animateToRegion(
          {
            latitude:
              coordinate.latitude,
            longitude:
              coordinate.longitude,
            latitudeDelta: 0.018,
            longitudeDelta: 0.018,
          },
          350
        );
      },
      []
    );

  const focusFacility =
    useCallback(
      (
        item: DistrictFacilityItem,
        coordinate: LatLng | null
      ) => {
        setSelectedFacilityId(
          item.id
        );

        if (!coordinate) {
          return;
        }

        mapRef.current?.animateToRegion(
          {
            latitude:
              coordinate.latitude,
            longitude:
              coordinate.longitude,
            latitudeDelta: 0.018,
            longitudeDelta: 0.018,
          },
          350
        );
      },
      []
    );


  const openPlaceDetail =
    useCallback(
      (placeId: string) => {
        if (!placeId) {
          return;
        }

        router.push({
          pathname:
            '/explore/place/[placeId]',
          params: {
            placeId,
          },
        } as any);
      },
      []
    );

  const openEventDetail =
    useCallback(
      (eventId: string) => {
        if (!eventId) {
          return;
        }

        router.push({
          pathname:
            '/explore/culture/[eventId]',
          params: {
            eventId,
          },
        } as any);
      },
      []
    );

  const openFacilityDetail =
    useCallback(
      (
        kind:
          DistrictFacilityItem['kind'],
        facilityId: string
      ) => {
        const normalizedFacilityId =
          String(
            facilityId ?? ''
          ).trim();

        if (!normalizedFacilityId) {
          return;
        }

        router.push({
          pathname:
            '/explore/facility/[facilityId]',
          params: {
            facilityId:
              normalizedFacilityId,
            kind,
          },
        } as any);
      },
      []
    );

  const openFacilityReservation =
    useCallback(
      async (
        url: string | null | undefined
      ) => {
        const normalizedUrl =
          String(url ?? '').trim();

        if (!normalizedUrl) {
          Alert.alert(
            '예약 페이지가 없어요.',
            '현재 연결된 예약 주소를 확인할 수 없어요.'
          );

          return;
        }

        try {
          const supported =
            await Linking.canOpenURL(
              normalizedUrl
            );

          if (!supported) {
            Alert.alert(
              '예약 페이지를 열 수 없어요.',
              '잠시 후 다시 시도해 주세요.'
            );

            return;
          }

          await Linking.openURL(
            normalizedUrl
          );
        } catch (error) {
          console.log(
            'CAMPING RESERVATION URL ERROR',
            error
          );

          Alert.alert(
            '예약 페이지를 열지 못했어요.',
            '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
          );
        }
      },
      []
    );

  if (!normalizedDistrictId) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <View
          style={
            styles.errorScreen
          }
        >
          <Text
            style={[
              styles.errorTitle,
              {
                color: theme.text,
              },
            ]}
          >
            지역 정보를 찾지
            못했어요.
          </Text>

          <Pressable
            onPress={() =>
              router.back()
            }
            style={[
              styles.errorButton,
              {
                borderColor:
                  theme.line,
              },
            ]}
          >
            <Text
              style={{
                color: theme.text,
                fontWeight: '800',
              }}
            >
              돌아가기
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const mapEmptyTitle =
    contentMode === 'events'
      ? eventLoading
        ? '문화행사를 불러오고 있어요.'
        : eventError
          ? '문화행사를 불러오지 못했어요.'
          : districtEvents.length > 0
            ? '지도 좌표가 있는 행사가 없어요.'
            : '현재 진행 중이거나 예정된 행사가 없어요.'
      : contentMode === 'facilities'
        ? districtFacilityItems.length >
          0
          ? '지도 좌표가 있는 예약시설이 없어요.'
          : '현재 조건에 맞는 예약시설이 없어요.'
        : '표시할 장소 좌표가 아직 없어요.';

  const mapEmptyDescription =
    contentMode === 'events'
      ? eventError ??
        '좌표가 없는 행사는 아래 목록에서 확인할 수 있어요.'
      : contentMode === 'facilities'
        ? districtFacilityItems.length >
          0
          ? '좌표가 없는 시설도 아래 목록에서 계속 확인할 수 있어요.'
          : '전체·캠핑·체육시설 필터를 바꾸어 확인해 보세요.'
        : '장소 목록은 아래에서 계속 확인할 수 있어요.';


  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + 32,
          },
        ]}
      >
        <View
          style={
            styles.headerRow
          }
        >
          <Pressable
            onPress={() =>
              router.back()
            }
            style={({ pressed }) => [
              styles.backButton,
              {
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 9,
                opacity: pressed
                  ? 0.6
                  : 1,
              },
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={theme.text}
            />
          </Pressable>

          <View
            style={
              styles.headerTextArea
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
              {districtName}
            </Text>

            <Text
              numberOfLines={2}
              style={[
                styles.subtitle,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {String(
                district?.subtitle ??
                  '지역의 탐험 장소를 지도에서 확인해 보세요.'
              )}
            </Text>
          </View>

          <View
            style={
              styles.headerStats
            }
          >
            {contentMode ===
            'places' ? (
              <>
                <Text
                  style={[
                    styles.headerStatText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  방문 {visitedCount}/
                  {places.length}
                </Text>

                <Text
                  style={[
                    styles.headerCoordinateText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  지도 장소{' '}
                  {markerItems.length}곳
                </Text>
              </>
            ) : contentMode ===
              'events' ? (
              <>
                <Text
                  style={[
                    styles.headerStatText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  행사{' '}
                  {
                    filteredDistrictEvents.length
                  }개
                </Text>

                <Text
                  style={[
                    styles.headerCoordinateText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  지도 행사{' '}
                  {
                    eventMarkerItems.length
                  }개
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={[
                    styles.headerStatText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  시설{' '}
                  {
                    districtFacilityItems.length
                  }곳
                </Text>

                <Text
                  style={[
                    styles.headerCoordinateText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  지도 시설{' '}
                  {
                    facilityMarkerItems.length
                  }곳
                </Text>
              </>
            )}
          </View>
        </View>

        <View
          style={[
            styles.contentModeCard,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 3
                  : 12,
            },
          ]}
        >
          {DISTRICT_CONTENT_OPTIONS.map(
            (option) => {
              const selected =
                contentMode ===
                option.id;

              return (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    if (
                      option.id ===
                      'facilities'
                    ) {
                      console.log(
                        'DISTRICT FACILITIES NAVIGATION START',
                        {
                          districtId:
                            normalizedDistrictId,
                        }
                      );

                      router.push({
                        pathname:
                          '/explore/district-facilities/[districtId]',
                        params: {
                          districtId:
                            normalizedDistrictId,
                        },
                      } as any);

                      return;
                    }

                    setContentMode(
                      option.id
                    );
                  }}
                  style={({ pressed }) => [
                    styles.contentModeButton,
                    {
                      backgroundColor:
                        selected
                          ? theme.background
                          : theme.card,
                      borderColor:
                        selected
                          ? theme.strongLine ??
                            theme.line
                          : theme.line,
                      borderRadius:
                        isCityBlack
                          ? 2
                          : 8,
                      opacity: pressed
                        ? 0.6
                        : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.contentModeButtonText,
                      {
                        color: selected
                          ? theme.text
                          : theme.subText,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            }
          )}
        </View>

        <View
          style={[
            styles.mapCard,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 4
                  : 16,
            },
          ]}
        >
{districtMapMounted ? (
          <MapView
            ref={mapRef}
            style={
              styles.map
            }
            initialRegion={
              initialRegion
            }
            mapType={
              districtMapType
            }
            customMapStyle={
              districtMapType ===
              'standard'
                ? ROOT_WARM_MAP_STYLE
                : []
            }
            onMapReady={() => {
              console.log(
                'DISTRICT MAP READY',
                {
                  districtId:
                    normalizedDistrictId,
                  elapsedMs:
                    Date.now() -
                    districtMapStartedAtRef.current,
                }
              );

              setMapReady(true);
            }}
            onRegionChangeComplete={(
              region
            ) => {
              setMapRegion(
                region
              );
            }}
            showsUserLocation
            showsMyLocationButton
            showsCompass
            loadingEnabled
            toolbarEnabled={false}
          >
            {contentMode ===
            'places'
              ? rootExploreMapRenderItems.map(
                  (item) => {
                    if (
                      item.kind ===
                      'cluster'
                    ) {
                      return (
                        <Marker
                          key={
                            item.id
                          }
                          coordinate={
                            item.coordinate
                          }
                          anchor={{
                            x: 0.5,
                            y: 0.5,
                          }}
                          tracksViewChanges={
                            trackMarkerChanges
                          }
                          onPress={() =>
                            zoomIntoRootExploreCluster(
                              item.coordinate
                            )
                          }
                        >
                          <RootExploreMapMarker
                            kind="cluster"
                            count={
                              item.count
                            }
                          />
                        </Marker>
                      );
                    }

                    const place =
                      item.place;

                    const coordinate =
                      item.coordinate;

                    const placeId =
                      String(
                        place?.id ?? ''
                      );

                    const completed =
                      completedPlaceIds.includes(
                        placeId
                      );

                    const selected =
                      selectedPlaceId ===
                      placeId;

                    return (
                      <Marker
                        key={
                          item.id
                        }
                        coordinate={
                          coordinate
                        }
                        title={String(
                          place?.name ??
                            '탐험 장소'
                        )}
                        description={
                          completed
                            ? '방문 완료'
                            : `미방문 · +${Number(
                                place?.rewardPoints ??
                                  0
                              )}P`
                        }
                        anchor={{
                          x: 0.5,
                          y: 0.5,
                        }}
                        tracksViewChanges={
                          trackMarkerChanges
                        }
                        onPress={() =>
                          focusPlace(
                            place,
                            coordinate
                          )
                        }
                        onCalloutPress={() =>
                          openPlaceDetail(
                            placeId
                          )
                        }
                      >
                        <RootExploreMapMarker
                          kind="place"
                          place={
                            place
                          }
                          selected={
                            selected
                          }
                          completed={
                            completed
                          }
                        />
                      </Marker>
                    );
                  }
                )
              : contentMode ===
                  'events'
                ? eventMarkerItems.map(
                    ({
                      event,
                      coordinate,
                    }) => {
                      const selected =
                        selectedEventId ===
                        event.id;

                      const completed =
                        completedPlaceIds.includes(
                          event.id
                        );

                      return (
                        <Marker
                          key={
                            event.id
                          }
                          coordinate={
                            coordinate
                          }
                          title={
                            event.title
                          }
                          description={`${getEventStatusLabel(
                            event
                          )} · ${formatSeoulCultureDateLabel(
                            event
                          )}`}
                          anchor={{
                            x: 0.5,
                            y: 0.5,
                          }}
                          tracksViewChanges={
                            trackMarkerChanges
                          }
                          onPress={() =>
                            focusEvent(
                              event,
                              coordinate
                            )
                          }
                          onCalloutPress={() =>
                            openEventDetail(
                              event.id
                            )
                          }
                        >
                          <View
                            collapsable={
                              false
                            }
                            renderToHardwareTextureAndroid
                            style={[
                              styles.eventMapMarker,
                              selected
                                ? styles.eventMapMarkerSelected
                                : null,
                              completed
                                ? styles.eventMapMarkerCompleted
                                : null,
                            ]}
                          >
                            <Text
                              style={[
                                styles.eventMapMarkerIcon,
                                selected
                                  ? styles.eventMapMarkerIconSelected
                                  : null,
                              ]}
                            >
                              {getSeoulCultureTypeIcon(
                                event.contentType
                              )}
                            </Text>

                            {getEventStatusLabel(
                              event
                            ) ===
                            '진행 중' ? (
                              <View
                                collapsable={
                                  false
                                }
                                style={
                                  styles.eventActiveDot
                                }
                              />
                            ) : null}
                          </View>
                        </Marker>
                      );
                    }
                  )
                : contentMode ===
                    'facilities'
                  ? facilityMarkerItems.map(
                      ({
                        item,
                        coordinate,
                      }) => {
                        const selected =
                          selectedFacilityId ===
                          item.id;

                        const isOpen =
                          item.status ===
                          'open';

                        return (
                          <Marker
                            key={item.id}
                            coordinate={
                              coordinate
                            }
                            title={item.name}
                            description={`${item.statusLabel} · ${item.receptionText}`}
                            anchor={{
                              x: 0.5,
                              y: 0.5,
                            }}
                            tracksViewChanges={
                              trackMarkerChanges
                            }
                            onPress={() =>
                              focusFacility(
                                item,
                                coordinate
                              )
                            }
                            onCalloutPress={() =>
                              void openFacilityReservation(
                                item.reservationUrl
                              )
                            }
                          >
                            <View
                              collapsable={
                                false
                              }
                              renderToHardwareTextureAndroid
                              style={[
                                styles.facilityMapMarker,
                                selected
                                  ? styles.facilityMapMarkerSelected
                                  : null,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.facilityMapMarkerIcon,
                                  selected
                                    ? styles.facilityMapMarkerIconSelected
                                    : null,
                                ]}
                              >
                                {item.icon}
                              </Text>

                              {isOpen ? (
                                <View
                                  collapsable={
                                    false
                                  }
                                  style={
                                    styles.facilityOpenDot
                                  }
                                />
                              ) : null}
                            </View>
                          </Marker>
                        );
                      }
                    )
                  : null}
          </MapView>
          ) : (
            <View
              style={[
                styles.map,
                {
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  backgroundColor:
                    theme.background,
                },
              ]}
            >
              <ActivityIndicator
                size="small"
                color={theme.text}
              />

              <Text
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: '700',
                  color:
                    theme.subText,
                }}
              >
                지도를 빠르게 불러오고 있어요.
              </Text>
            </View>
          )}

          <View
            style={[
              styles.mapTypeSelector,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 11,
              },
            ]}
          >
            {DISTRICT_MAP_TYPE_OPTIONS.map(
              (option) => {
                const selected =
                  districtMapType ===
                  option.id;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() =>
                      setDistrictMapType(
                        option.id
                      )
                    }
                    style={({ pressed }) => [
                      styles.mapTypeButton,
                      {
                        backgroundColor:
                          selected
                            ? theme.background
                            : theme.card,
                        borderColor:
                          selected
                            ? theme.strongLine ??
                              theme.line
                            : 'transparent',
                        borderRadius:
                          isCityBlack
                            ? 2
                            : 8,
                        opacity: pressed
                          ? 0.6
                          : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.mapTypeButtonText,
                        {
                          color: selected
                            ? theme.text
                            : theme.subText,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          {(contentMode ===
            'places' &&
            markerItems.length === 0) ||
          (contentMode ===
            'events' &&
            eventMarkerItems.length ===
              0) ||
          (contentMode ===
            'facilities' &&
            facilityMarkerItems.length ===
              0) ? (
            <View
              pointerEvents="none"
              style={[
                styles.mapEmptyOverlay,
                {
                  backgroundColor:
                    theme.card,
                },
              ]}
            >
              {eventLoading &&
              contentMode ===
                'events' ? (
                <ActivityIndicator
                  color={
                    theme.text
                  }
                />
              ) : (
                <Ionicons
                  name={
                    contentMode ===
                    'facilities'
                      ? 'calendar-outline'
                      : 'location-outline'
                  }
                  size={27}
                  color={
                    theme.subText
                  }
                />
              )}

              <Text
                style={[
                  styles.mapEmptyTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {mapEmptyTitle}
              </Text>

              <Text
                style={[
                  styles.mapEmptyText,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {mapEmptyDescription}
              </Text>
            </View>
          ) : null}
        </View>

        {contentMode ===
          'places' &&
        selectedPlace ? (
          <RootPlacePreviewCard
            place={
              selectedPlace
            }
            districtName={
              districtName
            }
            onOpenDetail={() =>
              openPlaceDetail(
                String(
                  selectedPlace?.id ??
                    ''
                )
              )
            }
            onSave={
              showRootPlaceSaveFoundationNotice
            }
            onDirections={() =>
              void openRootPlaceDirections(
                selectedPlace
              )
            }
            onShare={() =>
              void shareRootPlace(
                selectedPlace
              )
            }
            onContribution={(
              kind
            ) =>
              void handleRootPlaceContribution(
                selectedPlace,
                kind
              )
            }
          />
        ) : null}

        <RootPlaceContributionModal
          visible={
            rootPlaceReportDraft !==
            null
          }
          placeName={
            String(
              rootPlaceReportDraft
                ?.place
                ?.name ??
                'ROOT 탐험 장소'
            )
          }
          kind={
            rootPlaceReportDraft
              ?.kind ??
            'correction'
          }
          submitting={
            rootPlaceCommunityBusy
          }
          onClose={() => {
            if (
              !rootPlaceCommunityBusy
            ) {
              setRootPlaceReportDraft(
                null
              );
            }
          }}
          onSubmit={(
            selection
          ) =>
            void submitRootPlaceReport(
              selection
            )
          }
        />

        {contentMode ===
          'events' &&
        selectedEvent ? (
          <Pressable
            onPress={() =>
              openEventDetail(
                selectedEvent.id
              )
            }
            style={({ pressed }) => [
              styles.selectedItemCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.strongLine ??
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 14,
                opacity: pressed
                  ? 0.65
                  : 1,
              },
            ]}
          >
            <View
              style={[
                styles.selectedItemIconBox,
                styles.selectedEventIconBox,
                {
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 10,
                },
              ]}
            >
              <Text
                style={
                  styles.selectedItemIcon
                }
              >
                {getSeoulCultureTypeIcon(
                  selectedEvent.contentType
                )}
              </Text>
            </View>

            <View
              style={
                styles.selectedItemContent
              }
            >
              <Text
                numberOfLines={2}
                style={[
                  styles.selectedItemName,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {selectedEvent.title}
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.selectedItemMeta,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {formatSeoulCultureDateLabel(
                  selectedEvent
                )}{' '}
                ·{' '}
                {selectedEvent.place}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                theme.subText
              }
            />
          </Pressable>
        ) : null}

        {contentMode ===
          'facilities' &&
        selectedFacilityItem ? (
          <Pressable
            onPress={() =>
              void openFacilityReservation(
                selectedFacilityItem
                  .reservationUrl
              )
            }
            style={({ pressed }) => [
              styles.selectedItemCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.strongLine ??
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 14,
                opacity: pressed
                  ? 0.65
                  : 1,
              },
            ]}
          >
            <View
              style={[
                styles.selectedItemIconBox,
                styles.selectedFacilityIconBox,
                {
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 10,
                },
              ]}
            >
              <Text
                style={
                  styles.selectedItemIcon
                }
              >
                {selectedFacilityItem.icon}
              </Text>
            </View>

            <View
              style={
                styles.selectedItemContent
              }
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.selectedItemName,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {selectedFacilityItem.name}
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.selectedItemMeta,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {selectedFacilityItem.statusLabel}{' '}
                ·{' '}
                {selectedFacilityItem.receptionText}
              </Text>
            </View>

            <Ionicons
              name="open-outline"
              size={18}
              color={
                theme.subText
              }
            />
          </Pressable>
        ) : null}

        {contentMode ===
        'places' ? (
          <>
            <View
              style={[
                styles.rootPlaceSearchBar,
                {
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 14,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={17}
                color={
                  theme.subText
                }
              />
              <TextInput
                value={
                  placeSearchQuery
                }
                onChangeText={(
                  value
                ) => {
                  setPlaceSearchQuery(
                    value
                  );
                  setSelectedPlaceId(
                    null
                  );
                }}
                placeholder="장소명 또는 #야장 #노포로 검색"
                placeholderTextColor={
                  theme.subText
                }
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                style={[
                  styles.rootPlaceSearchInput,
                  {
                    color:
                      theme.text,
                  },
                ]}
              />
              {placeSearchQuery ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="장소 검색어 지우기"
                  onPress={() => {
                    setPlaceSearchQuery(
                      ''
                    );
                    setSelectedPlaceId(
                      null
                    );
                  }}
                  hitSlop={8}
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
                    name="close-circle"
                    size={18}
                    color={
                      theme.subText
                    }
                  />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.rootThemeFilterRow
              }
            >
              {ROOT_EXPLORE_THEME_OPTIONS.map(
                (option) => {
                  const selected =
                    selectedThemeFilter ===
                    option.id;

                  return (
                    <Pressable
                      key={
                        option.id
                      }
                      onPress={() => {
                        setSelectedThemeFilter(
                          option.id
                        );
                        setSelectedPlaceId(
                          null
                        );
                      }}
                      style={({ pressed }) => [
                        styles.rootThemeFilterChip,
                        {
                          backgroundColor:
                            selected
                              ? '#A96813'
                              : theme.card,
                          borderColor:
                            selected
                              ? '#A96813'
                              : theme.line,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 999,
                          opacity:
                            pressed
                              ? 0.62
                              : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          option.icon
                        }
                        size={14}
                        color={
                          selected
                            ? '#FFFFFF'
                            : theme.text
                        }
                      />
                      <Text
                        style={[
                          styles.rootThemeFilterChipText,
                          {
                            color:
                              selected
                                ? '#FFFFFF'
                                : theme.text,
                          },
                        ]}
                      >
                        {
                          option.label
                        }
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <View
              style={
                styles.filterRow
              }
            >
              {PLACE_FILTER_OPTIONS.map(
                (option) => {
                  const selected =
                    selectedFilter ===
                    option.id;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        setSelectedFilter(
                          option.id
                        )
                      }
                      style={({ pressed }) => [
                        styles.filterButton,
                        {
                          backgroundColor:
                            selected
                              ? theme.card
                              : theme.background,
                          borderColor:
                            selected
                              ? theme.strongLine ??
                                theme.line
                              : theme.line,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 9,
                          opacity: pressed
                            ? 0.6
                            : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterButtonText,
                          {
                            color: selected
                              ? theme.text
                              : theme.subText,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>

            <View
              style={
                styles.sectionHeader
              }
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
                탐험 장소
              </Text>

              <Text
                style={[
                  styles.sectionCount,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {filteredPlaces.length}
                곳
              </Text>
            </View>

            {loading ? (
              <View
                style={
                  styles.loadingBox
                }
              >
                <ActivityIndicator
                  color={
                    theme.text
                  }
                />

                <Text
                  style={[
                    styles.loadingText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  방문 기록을 불러오는
                  중이에요.
                </Text>
              </View>
            ) : filteredPlaces.length ===
              0 ? (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 3
                        : 14,
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
                  조건에 맞는 장소가
                  없어요.
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
                  다른 필터를 선택해
                  주세요.
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.itemList
                }
              >
                {visibleFilteredPlaces.map(
                  (place) => {
                    const placeId =
                      String(
                        place?.id ?? ''
                      );

                    const completed =
                      completedPlaceIds.includes(
                        placeId
                      );

                    const coordinate =
                      getPlaceCoordinate(
                        place
                      );

                    const metaText =
                      getPlaceMetaText(
                        place
                      );

                    return (
                      <Pressable
                        key={placeId}
                        onPress={() =>
                          focusPlace(
                            place,
                            coordinate
                          )
                        }
                        style={({ pressed }) => [
                          styles.itemCard,
                          {
                            backgroundColor:
                              theme.card,
                            borderColor:
                              selectedPlaceId ===
                              placeId
                                ? theme.strongLine ??
                                  theme.line
                                : theme.line,
                            borderRadius:
                              isCityBlack
                                ? 3
                                : 14,
                            opacity: pressed
                              ? 0.65
                              : 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.itemIconBox,
                            {
                              backgroundColor:
                                theme.background,
                              borderRadius:
                                isCityBlack
                                  ? 2
                                  : 10,
                            },
                          ]}
                        >
                          <Text
                            style={
                              styles.itemIcon
                            }
                          >
                            {String(
                              place?.icon ??
                                '📍'
                            )}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.itemContent
                          }
                        >
                          <View
                            style={
                              styles.itemTitleRow
                            }
                          >
                            <Text
                              numberOfLines={
                                1
                              }
                              style={[
                                styles.itemName,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              {String(
                                place?.name ??
                                  '탐험 장소'
                              )}
                            </Text>

                            <Text
                              style={[
                                styles.itemStatus,
                                {
                                  color:
                                    completed
                                      ? theme.text
                                      : theme.subText,
                                },
                              ]}
                            >
                              {completed
                                ? '방문 완료'
                                : `+${Number(
                                    place?.rewardPoints ??
                                      0
                                  )}P`}
                            </Text>
                          </View>

                          {metaText ? (
                            <Text
                              numberOfLines={
                                1
                              }
                              style={[
                                styles.itemMeta,
                                {
                                  color:
                                    theme.subText,
                                },
                              ]}
                            >
                              {metaText}
                            </Text>
                          ) : null}

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.itemLocation,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            {getPlaceLocationText(
                              place,
                              districtName
                            )}
                            {coordinate
                              ? ''
                              : ' · 좌표 준비 중'}
                          </Text>

                          <View
                            style={
                              styles.itemActionRow
                            }
                          >
                            <Text
                              style={[
                                styles.mapActionText,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              {coordinate
                                ? '지도에서 보기'
                                : '장소 정보 보기'}
                            </Text>

                            <Pressable
                              onPress={() =>
                                openPlaceDetail(
                                  placeId
                                )
                              }
                              hitSlop={8}
                              style={({
                                pressed,
                              }) => ({
                                opacity:
                                  pressed
                                    ? 0.55
                                    : 1,
                              })}
                            >
                              <Text
                                style={[
                                  styles.detailActionText,
                                  {
                                    color:
                                      theme.text,
                                  },
                                ]}
                              >
                                상세보기
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </Pressable>
                    );
                  }
                )}
              </View>
            )}
          </>
        ) : contentMode ===
          'events' ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.eventFilterRow
              }
            >
              {EVENT_TYPE_FILTER_OPTIONS.map(
                (option) => {
                  const selected =
                    eventTypeFilter ===
                    option.id;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        setEventTypeFilter(
                          option.id
                        )
                      }
                      style={({ pressed }) => [
                        styles.eventFilterButton,
                        {
                          backgroundColor:
                            selected
                              ? theme.card
                              : theme.background,
                          borderColor:
                            selected
                              ? theme.strongLine ??
                                theme.line
                              : theme.line,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 9,
                          opacity: pressed
                            ? 0.6
                            : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.eventFilterButtonText,
                          {
                            color: selected
                              ? theme.text
                              : theme.subText,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <View
              style={
                styles.sectionHeader
              }
            >
              <View>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {districtName}{' '}
                  축제·행사
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  현재 진행 중이거나
                  예정된 행사
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  void loadDistrictEvents(
                    true
                  )
                }
                style={({ pressed }) => ({
                  opacity: pressed
                    ? 0.55
                    : 1,
                })}
              >
                <Text
                  style={[
                    styles.refreshText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  새로고침
                </Text>
              </Pressable>
            </View>

            {eventLoading ? (
              <View
                style={
                  styles.loadingBox
                }
              >
                <ActivityIndicator
                  color={
                    theme.text
                  }
                />

                <Text
                  style={[
                    styles.loadingText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  {districtName} 행사를
                  불러오는 중이에요.
                </Text>
              </View>
            ) : eventError ? (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 3
                        : 14,
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
                  문화행사를 불러오지
                  못했어요.
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
                  {eventError}
                </Text>

                <Pressable
                  onPress={() =>
                    void loadDistrictEvents(
                      true
                    )
                  }
                  style={[
                    styles.retryButton,
                    {
                      borderColor:
                        theme.line,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.retryButtonText,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    다시 불러오기
                  </Text>
                </Pressable>
              </View>
            ) : filteredDistrictEvents.length ===
              0 ? (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 3
                        : 14,
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
                  조건에 맞는 행사가
                  없어요.
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
                  다른 행사 종류를
                  선택해 보세요.
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.itemList
                }
              >
                {filteredDistrictEvents.map(
                  (event) => {
                    const coordinate =
                      getEventCoordinate(
                        event
                      );

                    const selected =
                      selectedEventId ===
                      event.id;

                    const completed =
                      completedPlaceIds.includes(
                        event.id
                      );

                    return (
                      <Pressable
                        key={event.id}
                        onPress={() =>
                          focusEvent(
                            event,
                            coordinate
                          )
                        }
                        style={({ pressed }) => [
                          styles.itemCard,
                          {
                            backgroundColor:
                              theme.card,
                            borderColor:
                              selected
                                ? theme.strongLine ??
                                  theme.line
                                : theme.line,
                            borderRadius:
                              isCityBlack
                                ? 3
                                : 14,
                            opacity: pressed
                              ? 0.65
                              : 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.itemIconBox,
                            styles.eventItemIconBox,
                            {
                              borderRadius:
                                isCityBlack
                                  ? 2
                                  : 10,
                            },
                          ]}
                        >
                          <Text
                            style={
                              styles.itemIcon
                            }
                          >
                            {getSeoulCultureTypeIcon(
                              event.contentType
                            )}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.itemContent
                          }
                        >
                          <View
                            style={
                              styles.itemTitleRow
                            }
                          >
                            <Text
                              numberOfLines={
                                2
                              }
                              style={[
                                styles.itemName,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              {event.title}
                            </Text>

                            <Text
                              style={[
                                styles.itemStatus,
                                {
                                  color:
                                    completed
                                      ? theme.text
                                      : theme.subText,
                                },
                              ]}
                            >
                              {completed
                                ? '참여 완료'
                                : getEventStatusLabel(
                                    event
                                  )}
                            </Text>
                          </View>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.itemMeta,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            {getSeoulCultureTypeLabel(
                              event.contentType
                            )}{' '}
                            ·{' '}
                            {event.rawCategory}
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.itemLocation,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            {formatSeoulCultureDateLabel(
                              event
                            )}
                            {event.eventTime
                              ? ` · ${event.eventTime}`
                              : ''}
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.eventConditionText,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            {event.isFree ===
                            true
                              ? '무료'
                              : event.isFree ===
                                  false
                                ? '유료'
                                : '요금 확인'}{' '}
                            ·{' '}
                            {getSeoulCultureReservationLabel(
                              event.reservationStatus
                            )}{' '}
                            ·{' '}
                            {getSeoulCultureVenueTypeLabel(
                              event.venueType
                            )}
                          </Text>

                          <View
                            style={
                              styles.itemActionRow
                            }
                          >
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.mapActionText,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              {coordinate
                                ? '지도에서 보기'
                                : '지도 위치 확인 중'}
                            </Text>

                            <Pressable
                              onPress={() =>
                                openEventDetail(
                                  event.id
                                )
                              }
                              hitSlop={8}
                              style={({
                                pressed,
                              }) => ({
                                opacity:
                                  pressed
                                    ? 0.55
                                    : 1,
                              })}
                            >
                              <Text
                                style={[
                                  styles.detailActionText,
                                  {
                                    color:
                                      theme.text,
                                  },
                                ]}
                              >
                                상세보기
                              </Text>
                            </Pressable>
                          </View>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.eventPlaceText,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            {event.place}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  }
                )}
              </View>
            )}
          </>
        ) : (
          <>
            <View
              style={
                styles.filterRow
              }
            >
              {DISTRICT_FACILITY_CATEGORY_OPTIONS.map(
                (option) => {
                  const selected =
                    facilityCategoryFilter ===
                    option.id;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => {
                        setFacilityCategoryFilter(
                          option.id
                        );
                        setSelectedFacilityId(
                          null
                        );
                      }}
                      style={({ pressed }) => [
                        styles.filterButton,
                        {
                          backgroundColor:
                            selected
                              ? theme.card
                              : theme.background,
                          borderColor:
                            selected
                              ? theme.strongLine ??
                                theme.line
                              : theme.line,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 9,
                          opacity: pressed
                            ? 0.6
                            : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterButtonText,
                          {
                            color:
                              selected
                                ? theme.text
                                : theme.subText,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>

            <View
              style={
                styles.sectionHeader
              }
            >
              <View>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {districtName}{' '}
                  예약·시설
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  캠핑·피크닉{' '}
                  {
                    districtCampingFacilityItems.length
                  }
                  곳 · 체육시설{' '}
                  {
                    districtSportsFacilityItems.length
                  }
                  곳 · 공간대관{' '}
                  {
                    districtSpaceFacilityItems.length
                  }
                  곳 · 교육·체험{' '}
                  {
                    districtEducationFacilityItems.length
                  }
                  곳
                </Text>
              </View>

              <Text
                style={[
                  styles.sectionCount,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {
                  districtFacilityItems.length
                }
                곳
              </Text>
            </View>

            {districtFacilityItems.length ===
            0 ? (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 3
                        : 14,
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
                  현재 조건에 맞는
                  예약시설이 없어요.
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
                  전체·캠핑·체육시설·공간대관·교육·체험
                  필터를 바꾸어 확인해
                  보세요.
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.itemList
                }
              >
                {districtFacilityItems.map(
                  (item) => {
                    const coordinate =
                      item.coordinate;

                    const selected =
                      selectedFacilityId ===
                      item.id;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() =>
                          focusFacility(
                            item,
                            coordinate
                          )
                        }
                        style={({ pressed }) => [
                          styles.itemCard,
                          {
                            backgroundColor:
                              theme.card,
                            borderColor:
                              selected
                                ? theme.strongLine ??
                                  theme.line
                                : theme.line,
                            borderRadius:
                              isCityBlack
                                ? 3
                                : 14,
                            opacity: pressed
                              ? 0.65
                              : 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.itemIconBox,
                            styles.facilityItemIconBox,
                            {
                              borderRadius:
                                isCityBlack
                                  ? 2
                                  : 10,
                            },
                          ]}
                        >
                          <Text
                            style={
                              styles.itemIcon
                            }
                          >
                            {item.icon}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.itemContent
                          }
                        >
                          <View
                            style={
                              styles.itemTitleRow
                            }
                          >
                            <Text
                              numberOfLines={
                                2
                              }
                              style={[
                                styles.itemName,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              {item.name}
                            </Text>

                            <Text
                              style={[
                                styles.itemStatus,
                                {
                                  color:
                                    item.status ===
                                    'open'
                                      ? theme.text
                                      : theme.subText,
                                },
                              ]}
                            >
                              {item.statusLabel}
                            </Text>
                          </View>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.itemMeta,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            {item.kind ===
                            'camping'
                              ? '캠핑·피크닉'
                              : item.kind ===
                                  'sports'
                                ? '체육시설'
                                : item.kind ===
                                    'space'
                                  ? '공간대관'
                                  : '교육·체험'}{' '}
                            ·{' '}
                            {item.categoryLabel}{' '}
                            ·{' '}
                            {item.kind ===
                            'education'
                              ? '프로그램'
                              : '예약상품'}{' '}
                            {
                              item.reservationCount
                            }
                            개
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.itemLocation,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            {item.district ||
                              districtName}
                            {' · '}
                            {item.receptionText}
                          </Text>

                          {item.primaryTitle ? (
                            <Text
                              numberOfLines={2}
                              style={[
                                styles.facilityReservationTitle,
                                {
                                  color:
                                    theme.subText,
                                },
                              ]}
                            >
                              {item.primaryTitle}
                            </Text>
                          ) : null}

                          <View
                            style={
                              styles.itemActionRow
                            }
                          >
                            <Text
                              style={[
                                styles.mapActionText,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              {coordinate
                                ? '지도에서 보기'
                                : '시설 정보 보기'}
                            </Text>

                            <Pressable
                              onPress={() =>
                                openFacilityDetail(
                                  item.kind,
                                  item.sourceId
                                )
                              }
                              hitSlop={8}
                              style={({
                                pressed,
                              }) => ({
                                opacity:
                                  pressed
                                    ? 0.55
                                    : 1,
                              })}
                            >
                              <Text
                                style={[
                                  styles.detailActionText,
                                  {
                                    color:
                                      theme.text,
                                  },
                                ]}
                              >
                                상세보기
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() =>
                                void openFacilityReservation(
                                  item.reservationUrl
                                )
                              }
                              hitSlop={8}
                              style={({
                                pressed,
                              }) => ({
                                opacity:
                                  pressed
                                    ? 0.55
                                    : 1,
                              })}
                            >
                              <Text
                                style={[
                                  styles.detailActionText,
                                  {
                                    color:
                                      theme.text,
                                  },
                                ]}
                              >
                                {item.kind ===
                                'education'
                                  ? '신청 페이지'
                                  : '예약 페이지'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </Pressable>
                    );
                  }
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 14,
      paddingTop: 8,
    },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 11,
    },

    backButton: {
      width: 36,
      height: 36,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerTextArea: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontSize: 21,
      lineHeight: 27,
      fontWeight: '900',
    },

    subtitle: {
      marginTop: 3,
      fontSize: 10.5,
      lineHeight: 16,
    },

    headerStats: {
      paddingTop: 2,
      alignItems: 'flex-end',
      gap: 3,
    },

    headerStatText: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '800',
      textAlign: 'right',
    },

    headerCoordinateText: {
      fontSize: 9,
      lineHeight: 13,
      textAlign: 'right',
    },

    contentModeCard: {
      marginBottom: 10,
      padding: 4,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 4,
    },

    contentModeButton: {
      flex: 1,
      minHeight: 39,
      paddingHorizontal: 7,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    contentModeButtonText: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    mapCard: {
      height: 390,
      borderWidth: 1,
      overflow: 'hidden',
    },

    map: {
      flex: 1,
    },

    mapTypeSelector: {
      position: 'absolute',
      top: 11,
      left: 11,
      zIndex: 20,
      elevation: 6,
      padding: 3,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },

    mapTypeButton: {
      minWidth: 45,
      minHeight: 32,
      paddingHorizontal: 9,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    mapTypeButtonText: {
      fontSize: 10,
      fontWeight: '900',
    },

    mapEmptyOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 5,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },

    mapEmptyTitle: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: '900',
      textAlign: 'center',
    },

    mapEmptyText: {
      marginTop: 5,
      maxWidth: 250,
      fontSize: 10.5,
      lineHeight: 16,
      textAlign: 'center',
    },

    rootMapMarker: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 2,
      borderColor: '#A87532',
      backgroundColor: '#FFF8E8',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 5,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.22,
      shadowRadius: 3,
    },

    rootMapMarkerSelected: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 3,
      borderColor: '#8A4D18',
      backgroundColor: '#FFE7AC',
      elevation: 8,
    },

    rootMapMarkerCompleted: {
      borderColor: '#3D9661',
      backgroundColor: '#EAF6DE',
    },

    rootMapMarkerIcon: {
      fontSize: 20,
      lineHeight: 25,
      textAlign: 'center',
    },

    rootMapMarkerIconSelected: {
      fontSize: 24,
      lineHeight: 29,
    },

    rootMapMarkerCheck: {
      position: 'absolute',
      top: -5,
      right: -5,
      width: 17,
      height: 17,
      borderRadius: 8.5,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      backgroundColor: '#3D9661',
      alignItems: 'center',
      justifyContent: 'center',
    },

    eventMapMarker: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 2,
      borderColor: '#9A5B95',
      backgroundColor: '#FFF0FA',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 5,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.22,
      shadowRadius: 3,
    },

    eventMapMarkerSelected: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 3,
      borderColor: '#71396C',
      backgroundColor: '#F8D4F1',
      elevation: 8,
    },

    eventMapMarkerCompleted: {
      borderColor: '#3D9661',
      backgroundColor: '#EAF6DE',
    },

    eventMapMarkerIcon: {
      fontSize: 20,
      lineHeight: 25,
      textAlign: 'center',
    },

    eventMapMarkerIconSelected: {
      fontSize: 24,
      lineHeight: 29,
    },

    eventActiveDot: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      backgroundColor: '#E05A7A',
    },

    facilityMapMarker: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 2,
      borderColor: '#3D7D71',
      backgroundColor: '#EEF9F3',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 5,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.22,
      shadowRadius: 3,
    },

    facilityMapMarkerSelected: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 3,
      borderColor: '#275D54',
      backgroundColor: '#D8F2E6',
      elevation: 8,
    },

    facilityMapMarkerIcon: {
      fontSize: 20,
      lineHeight: 25,
      textAlign: 'center',
    },

    facilityMapMarkerIconSelected: {
      fontSize: 24,
      lineHeight: 29,
    },

    facilityOpenDot: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      backgroundColor: '#3D9661',
    },

    selectedItemCard: {
      marginTop: 10,
      padding: 11,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    selectedItemIconBox: {
      width: 43,
      height: 43,
      alignItems: 'center',
      justifyContent: 'center',
    },

    selectedEventIconBox: {
      backgroundColor: '#FFF0FA',
    },

    selectedFacilityIconBox: {
      backgroundColor: '#EEF9F3',
    },

    selectedItemIcon: {
      fontSize: 22,
    },

    selectedItemContent: {
      flex: 1,
      minWidth: 0,
    },

    selectedItemName: {
      fontSize: 13,
      fontWeight: '900',
    },

    selectedItemMeta: {
      marginTop: 4,
      fontSize: 10,
    },

    rootPlaceSearchBar: {
      marginTop: 12,
      minHeight: 44,
      paddingHorizontal: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    rootPlaceSearchInput: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 0,
      fontSize: 11,
      fontWeight: '700',
    },

    rootThemeFilterRow: {
      marginTop: 9,
      paddingRight: 8,
      gap: 7,
      alignItems: 'center',
    },

    rootThemeFilterChip: {
      minHeight: 34,
      paddingHorizontal: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    rootThemeFilterChipText: {
      fontSize: 9.5,
      fontWeight: '900',
    },

    filterRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 7,
    },

    filterButton: {
      flex: 1,
      minHeight: 38,
      paddingHorizontal: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    filterButtonText: {
      fontSize: 10.5,
      fontWeight: '800',
    },

    eventFilterRow: {
      marginTop: 12,
      paddingRight: 12,
      gap: 7,
    },

    eventFilterButton: {
      minWidth: 67,
      minHeight: 36,
      paddingHorizontal: 13,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    eventFilterButtonText: {
      fontSize: 10.5,
      fontWeight: '800',
    },

    sectionHeader: {
      marginTop: 17,
      marginBottom: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: '900',
    },

    sectionSubtitle: {
      marginTop: 3,
      fontSize: 9.5,
      lineHeight: 14,
    },

    sectionCount: {
      fontSize: 10.5,
      fontWeight: '700',
    },

    refreshText: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    loadingBox: {
      minHeight: 150,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },

    loadingText: {
      fontSize: 10.5,
      textAlign: 'center',
    },

    emptyCard: {
      padding: 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyTitle: {
      fontSize: 13,
      fontWeight: '900',
      textAlign: 'center',
    },

    emptyText: {
      marginTop: 5,
      fontSize: 10.5,
      lineHeight: 16,
      textAlign: 'center',
    },

    retryButton: {
      marginTop: 13,
      minHeight: 36,
      paddingHorizontal: 15,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    retryButtonText: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    itemList: {
      gap: 8,
    },

    itemCard: {
      padding: 11,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    itemIconBox: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
    },

    eventItemIconBox: {
      backgroundColor: '#FFF0FA',
    },

    facilityItemIconBox: {
      backgroundColor: '#EEF9F3',
    },

    itemIcon: {
      fontSize: 23,
    },

    itemContent: {
      flex: 1,
      minWidth: 0,
    },

    itemTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },

    itemName: {
      flex: 1,
      minWidth: 0,
      fontSize: 12.5,
      lineHeight: 17,
      fontWeight: '900',
    },

    itemStatus: {
      fontSize: 10,
      fontWeight: '800',
    },

    itemMeta: {
      marginTop: 4,
      fontSize: 9.5,
    },

    itemLocation: {
      marginTop: 4,
      fontSize: 9.5,
      lineHeight: 14,
    },

    eventConditionText: {
      marginTop: 4,
      fontSize: 9.5,
      lineHeight: 14,
    },

    eventPlaceText: {
      marginTop: 5,
      fontSize: 9.5,
      lineHeight: 14,
    },

    facilityReservationTitle: {
      marginTop: 5,
      fontSize: 9.5,
      lineHeight: 14,
    },

    itemActionRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    mapActionText: {
      flex: 1,
      minWidth: 0,
      fontSize: 10,
      fontWeight: '800',
    },

    detailActionText: {
      fontSize: 10,
      fontWeight: '900',
    },

    errorScreen: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },

    errorTitle: {
      fontSize: 16,
      fontWeight: '900',
      textAlign: 'center',
    },

    errorButton: {
      marginTop: 14,
      paddingHorizontal: 16,
      minHeight: 40,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
