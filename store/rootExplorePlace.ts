// ROOT_EXPLORE_V1_COMMON_PLACE_FOUNDATION

export type RootExploreTheme =
  | 'all'
  | 'cafe'
  | 'yajang'
  | 'nopo'
  | 'food'
  | 'nature';

export type RootPlaceContributionKind =
  | 'photo'
  | 'business_hours'
  | 'waiting'
  | 'outdoor_status'
  // ROOT_EXPLORE_V12A_RAIN_STATUS_KIND
  | 'rain_status'
  | 'visit'
  | 'correction';

export type RootPlaceContributionDraft = {
  placeId: string;
  kind: RootPlaceContributionKind;
  value?: string;
  createdAt: string;
};

export const ROOT_EXPLORE_THEME_OPTIONS:
  readonly {
    id: RootExploreTheme;
    label: string;
    icon:
      | 'map-outline'
      | 'cafe-outline'
      | 'beer-outline'
      | 'time-outline'
      | 'restaurant-outline'
      | 'leaf-outline';
  }[] = [
    {
      id: 'all',
      label: '전체',
      icon: 'map-outline',
    },
    {
      id: 'cafe',
      label: '카페',
      icon: 'cafe-outline',
    },
    {
      id: 'yajang',
      label: '야장',
      icon: 'beer-outline',
    },
    {
      id: 'nopo',
      label: '노포',
      icon: 'time-outline',
    },
    {
      id: 'food',
      label: '맛집',
      icon: 'restaurant-outline',
    },
    {
      id: 'nature',
      label: '자연',
      icon: 'leaf-outline',
    },
  ];

function clean(
  value: unknown
) {
  return String(
    value ?? ''
  )
    .trim()
    .toLowerCase();
}

function listText(
  value: unknown
) {
  if (
    Array.isArray(value)
  ) {
    return value
      .map(clean)
      .filter(Boolean)
      .join(' ');
  }

  return clean(value);
}

export function getRootExplorePlaceSearchText(
  place: any
) {
  return [
    place?.name,
    place?.category,
    place?.areaType,
    place?.primaryTheme,
    place?.subCategory,
    place?.address,
    place?.locationText,
    place?.placeAddress,
    place?.districtName,
    place?.description,
    place?.summary,
    place?.memo,
    place?.rootTags,
    place?.tags,
    place?.themes,
    place?.keywords,
    place?.features,
  ]
    .map(listText)
    .filter(Boolean)
    .join(' ');
}

function includesAny(
  text: string,
  keywords: readonly string[]
) {
  return keywords.some(
    (keyword) =>
      text.includes(keyword)
  );
}

const THEME_KEYWORDS:
  Record<
    Exclude<
      RootExploreTheme,
      'all'
    >,
    readonly string[]
  > = {
    cafe: [
      '카페',
      'cafe',
      'coffee',
      '커피',
      '베이커리',
      '브런치',
    ],
    yajang: [
      '야장',
      '포장마차',
      '노가리',
      '야외석',
      '야외 테이블',
      '야외테이블',
      '야외 자리',
      '야외자리',
      'outdoor seating',
    ],
    nopo: [
      '노포',
      '노포감성',
      '오래된 가게',
      '오래된 식당',
      '오래된 분식',
      '전통 노포',
      'since 19',
      'since 18',
    ],
    food: [
      '맛집',
      '음식',
      '식당',
      '한식',
      '분식',
      '떡볶이',
      '고기',
      '주점',
      '포차',
      '호프',
      'restaurant',
    ],
    nature: [
      '자연',
      '계곡',
      '해수욕장',
      '해변',
      '바다',
      '산',
      '공원',
      '숲',
      '호수',
      '폭포',
      '수목원',
      '둘레길',
    ],
  };

export function matchesRootExploreTheme(
  place: any,
  theme: RootExploreTheme
) {
  if (
    theme === 'all'
  ) {
    return true;
  }

  const text =
    getRootExplorePlaceSearchText(
      place
    );

  return includesAny(
    text,
    THEME_KEYWORDS[theme]
  );
}

export function matchesRootExploreQuery(
  place: any,
  query: string
) {
  const terms =
    clean(query)
      .split(/\s+/)
      .map(
        (term) =>
          term.replace(
            /^#+/,
            ''
          )
      )
      .filter(Boolean);

  if (terms.length === 0) {
    return true;
  }

  const searchText =
    getRootExplorePlaceSearchText(
      place
    );

  return terms.every(
    (term) =>
      searchText.includes(term)
  );
}

export function getRootExplorePlaceTags(
  place: any
) {
  const labels: string[] = [];

  const category =
    String(
      place?.category ?? ''
    ).trim();

  const areaType =
    String(
      place?.areaType ?? ''
    ).trim();

  if (category) {
    labels.push(category);
  }

  if (
    areaType &&
    areaType !== category
  ) {
    labels.push(areaType);
  }

  for (
    const option of
    ROOT_EXPLORE_THEME_OPTIONS
  ) {
    if (
      option.id === 'all'
    ) {
      continue;
    }

    if (
      matchesRootExploreTheme(
        place,
        option.id
      )
    ) {
      labels.push(
        option.label
      );
    }
  }

  return Array.from(
    new Set(
      labels
        .map(
          (label) =>
            label.trim()
        )
        .filter(Boolean)
    )
  ).slice(0, 4);
}

export function getRootExplorePlaceImageUrl(
  place: any
) {
  const candidates =
    [
      // ROOT_EXPLORE_V12B_USER_PHOTO_PRIORITY
      place?.latestUserPhotoUrl,
      // ROOT_EXPLORE_V12C_APPROVED_PUBLIC_PHOTO_PRIORITY
      place?.approvedUserPhotoUrl,
      place?.thumbnailImageUrl,
      place?.representativeImageUrl,
      place?.mainImageUrl,
      place?.imageUrl,
      place?.photoUrl,
      place?.mainImage,
      place?.image,
    ];

  for (
    const candidate of candidates
  ) {
    const value =
      String(
        candidate ?? ''
      ).trim();

    if (
      /^https?:\/\//i.test(
        value
      )
    ) {
      return value;
    }
  }

  return '';
}
