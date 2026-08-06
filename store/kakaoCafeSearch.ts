export type KakaoCafeSearchResult = {
  id: string;
  name: string;
  categoryName: string;
  address: string;
  roadAddress: string;
  displayAddress: string;
  latitude: number;
  longitude: number;
  phone: string;
  placeUrl: string;
};

type KakaoKeywordDocument = {
  id?: unknown;
  place_name?: unknown;
  category_name?: unknown;
  phone?: unknown;
  address_name?: unknown;
  road_address_name?: unknown;
  x?: unknown;
  y?: unknown;
  place_url?: unknown;
};

type KakaoKeywordResponse = {
  documents?: unknown;
  message?: unknown;
  msg?: unknown;
};

function readString(
  value: unknown,
) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function getKakaoRestApiKey() {
  const key =
    process.env
      .EXPO_PUBLIC_KAKAO_REST_API_KEY
      ?.trim() ?? '';

  if (!key) {
    throw new Error(
      '카카오 REST API 키가 설정되지 않았어요. .env 파일에 EXPO_PUBLIC_KAKAO_REST_API_KEY를 추가한 뒤 Expo를 다시 시작해 주세요.',
    );
  }

  return key;
}

function normalizeDocument(
  value: unknown,
): KakaoCafeSearchResult | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const document =
    value as KakaoKeywordDocument;

  const id =
    readString(document.id);
  const name =
    readString(
      document.place_name,
    );
  const address =
    readString(
      document.address_name,
    );
  const roadAddress =
    readString(
      document.road_address_name,
    );
  const latitude =
    Number(
      readString(document.y),
    );
  const longitude =
    Number(
      readString(document.x),
    );

  if (
    !id ||
    !name ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    id,
    name,
    categoryName:
      readString(
        document.category_name,
      ),
    address,
    roadAddress,
    displayAddress:
      roadAddress ||
      address ||
      '주소 정보 없음',
    latitude,
    longitude,
    phone:
      readString(document.phone),
    placeUrl:
      readString(
        document.place_url,
      ),
  };
}

export async function searchKakaoCafes(
  query: string,
): Promise<KakaoCafeSearchResult[]> {
  const trimmedQuery =
    query.trim();

  if (!trimmedQuery) {
    throw new Error(
      '검색할 카페 이름을 입력해 주세요.',
    );
  }

  const apiKey =
    getKakaoRestApiKey();

  const url =
    'https://dapi.kakao.com/v2/local/search/keyword.json' +
    `?query=${encodeURIComponent(trimmedQuery)}` +
    '&category_group_code=CE7' +
    '&size=15' +
    '&sort=accuracy';

  let response: Response;

  try {
    response =
      await fetch(
        url,
        {
          method: 'GET',
          headers: {
            Authorization:
              `KakaoAK ${apiKey}`,
            Accept:
              'application/json',
          },
        },
      );
  } catch (error) {
    console.log(
      'KAKAO CAFE SEARCH NETWORK ERROR',
      error,
    );

    throw new Error(
      '카페 검색 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.',
    );
  }

  let payload:
    KakaoKeywordResponse = {};

  try {
    payload =
      await response.json() as
        KakaoKeywordResponse;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const apiMessage =
      readString(
        payload.message,
      ) ||
      readString(payload.msg);

    console.log(
      'KAKAO CAFE SEARCH HTTP ERROR',
      {
        status:
          response.status,
        apiMessage,
      },
    );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      throw new Error(
        '카카오 REST API 키를 확인해 주세요. 카카오디벨로퍼스의 REST API 키를 .env에 입력해야 해요.',
      );
    }

    if (
      response.status === 429
    ) {
      throw new Error(
        '오늘 사용할 수 있는 카페 검색 횟수를 초과했어요. 잠시 후 다시 시도해 주세요.',
      );
    }

    throw new Error(
      apiMessage ||
        '카페 검색 중 오류가 발생했어요.',
    );
  }

  if (
    !Array.isArray(
      payload.documents,
    )
  ) {
    return [];
  }

  return payload.documents
    .map(normalizeDocument)
    .filter(
      (
        item,
      ): item is KakaoCafeSearchResult =>
        item !== null,
    );
}
