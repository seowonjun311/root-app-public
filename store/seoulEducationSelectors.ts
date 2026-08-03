import {
  SEOUL_EDUCATION_PLACES,
  type SeoulEducationAudience,
  type SeoulEducationCategory,
  type SeoulEducationPlace,
  type SeoulEducationProgram,
} from './seoulEducationPrograms';

export type RootEducationStatus =
  | 'open'
  | 'scheduled'
  | 'paused'
  | 'closed'
  | 'unknown';

export type SeoulEducationPlaceSummary = {
  place: SeoulEducationPlace;
  primaryProgram:
    SeoulEducationProgram | null;
  status: RootEducationStatus;
  statusLabel: string;
  openProgramCount: number;
  scheduledProgramCount: number;
};

function parseEducationDate(
  value: string | null
) {
  if (!value) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    !Number.isFinite(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}

export function getEducationProgramStatus(
  program:
    SeoulEducationProgram,
  now = new Date()
): RootEducationStatus {
  const statusText =
    program.statusText.trim();

  if (
    statusText.includes('접수중')
  ) {
    return 'open';
  }

  if (
    statusText.includes('안내중')
  ) {
    return 'scheduled';
  }

  if (
    statusText.includes(
      '예약일시중지'
    )
  ) {
    return 'paused';
  }

  if (
    statusText.includes('마감') ||
    statusText.includes('종료')
  ) {
    return 'closed';
  }

  const receptionStart =
    parseEducationDate(
      program.receptionStartAt
    );

  const receptionEnd =
    parseEducationDate(
      program.receptionEndAt
    );

  if (
    receptionStart &&
    now.getTime() <
      receptionStart.getTime()
  ) {
    return 'scheduled';
  }

  if (
    receptionStart &&
    receptionEnd &&
    now.getTime() >=
      receptionStart.getTime() &&
    now.getTime() <=
      receptionEnd.getTime()
  ) {
    return 'open';
  }

  if (
    receptionEnd &&
    now.getTime() >
      receptionEnd.getTime()
  ) {
    return 'closed';
  }

  return 'unknown';
}

export function getEducationStatusLabel(
  status:
    RootEducationStatus
) {
  if (status === 'open') {
    return '접수 중';
  }

  if (status === 'scheduled') {
    return '접수 예정';
  }

  if (status === 'paused') {
    return '예약 일시중지';
  }

  if (status === 'closed') {
    return '예약 마감';
  }

  return '상태 확인';
}

export function getEducationCategoryLabel(
  category:
    SeoulEducationCategory
) {
  if (
    category ===
    'craftMaking'
  ) {
    return '공예·만들기';
  }

  if (
    category ===
    'cookingFood'
  ) {
    return '요리·식생활';
  }

  if (
    category ===
    'natureEnvironment'
  ) {
    return '환경·생태';
  }

  if (
    category ===
    'urbanAgriculture'
  ) {
    return '도시농업';
  }

  if (
    category ===
    'familyParenting'
  ) {
    return '가족·부모';
  }

  if (
    category ===
    'historyCulture'
  ) {
    return '역사·문화';
  }

  if (
    category ===
    'scienceDigital'
  ) {
    return '과학·디지털';
  }

  if (
    category ===
    'healthSportsSafety'
  ) {
    return '건강·체육·안전';
  }

  if (
    category ===
    'careerYouth'
  ) {
    return '진로·청년';
  }

  if (
    category ===
    'liberalArtsLanguage'
  ) {
    return '교양·어학';
  }

  return '기타';
}

export function getEducationAudienceLabel(
  audience:
    SeoulEducationAudience
) {
  if (audience === 'all') {
    return '누구나';
  }

  if (
    audience === 'children'
  ) {
    return '어린이';
  }

  if (audience === 'teen') {
    return '청소년';
  }

  if (audience === 'youth') {
    return '청년';
  }

  if (audience === 'adult') {
    return '성인';
  }

  if (audience === 'senior') {
    return '어르신';
  }

  if (audience === 'family') {
    return '가족';
  }

  return '대상 확인';
}

function getEducationStatusRank(
  status:
    RootEducationStatus
) {
  if (status === 'open') {
    return 0;
  }

  if (
    status === 'scheduled'
  ) {
    return 1;
  }

  if (status === 'paused') {
    return 2;
  }

  if (status === 'unknown') {
    return 3;
  }

  return 4;
}

export function getPrimaryEducationProgram(
  place:
    SeoulEducationPlace,
  now = new Date()
) {
  const programs =
    [...place.programs].sort(
      (first, second) => {
        const statusDifference =
          getEducationStatusRank(
            getEducationProgramStatus(
              first,
              now
            )
          ) -
          getEducationStatusRank(
            getEducationProgramStatus(
              second,
              now
            )
          );

        if (
          statusDifference !== 0
        ) {
          return statusDifference;
        }

        return first.title.localeCompare(
          second.title,
          'ko'
        );
      }
    );

  return programs[0] ?? null;
}

export function getEducationPlaceSummary(
  place:
    SeoulEducationPlace,
  now = new Date()
): SeoulEducationPlaceSummary {
  let openProgramCount = 0;
  let scheduledProgramCount = 0;

  for (
    const program of
      place.programs
  ) {
    const status =
      getEducationProgramStatus(
        program,
        now
      );

    if (status === 'open') {
      openProgramCount += 1;
    }

    if (
      status === 'scheduled'
    ) {
      scheduledProgramCount += 1;
    }
  }

  const primaryProgram =
    getPrimaryEducationProgram(
      place,
      now
    );

  const status =
    primaryProgram
      ? getEducationProgramStatus(
          primaryProgram,
          now
        )
      : 'unknown';

  return {
    place,
    primaryProgram,
    status,
    statusLabel:
      getEducationStatusLabel(
        status
      ),
    openProgramCount,
    scheduledProgramCount,
  };
}

export function getEducationPlaceSummaries(
  now = new Date()
) {
  return SEOUL_EDUCATION_PLACES
    .map((place) =>
      getEducationPlaceSummary(
        place,
        now
      )
    )
    .sort((first, second) => {
      const statusDifference =
        getEducationStatusRank(
          first.status
        ) -
        getEducationStatusRank(
          second.status
        );

      if (
        statusDifference !== 0
      ) {
        return statusDifference;
      }

      const districtDifference =
        first.place.locationLabel.localeCompare(
          second.place.locationLabel,
          'ko'
        );

      if (
        districtDifference !== 0
      ) {
        return districtDifference;
      }

      return first.place.name.localeCompare(
        second.place.name,
        'ko'
      );
    });
}

export function getInsideSeoulEducationSummaries(
  now = new Date()
) {
  return getEducationPlaceSummaries(
    now
  ).filter(
    (summary) =>
      summary.place.operationScope ===
      'insideSeoul'
  );
}

export function getSeoulOperatedOutsideEducationSummaries(
  now = new Date()
) {
  return getEducationPlaceSummaries(
    now
  ).filter(
    (summary) =>
      summary.place.operationScope ===
      'seoulOperatedOutside'
  );
}

export function getEducationSummariesByDistrict(
  district: string,
  now = new Date()
) {
  const normalizedDistrict =
    district.trim();

  return getInsideSeoulEducationSummaries(
    now
  ).filter(
    (summary) =>
      summary.place.district ===
      normalizedDistrict
  );
}

export function getEducationSummariesByCategory(
  category:
    SeoulEducationCategory,
  now = new Date()
) {
  return getEducationPlaceSummaries(
    now
  ).filter(
    (summary) =>
      summary.place.categoryNames.includes(
        category
      )
  );
}

export function getEducationSummariesByAudience(
  audience:
    SeoulEducationAudience,
  now = new Date()
) {
  return getEducationPlaceSummaries(
    now
  ).filter(
    (summary) =>
      summary.place.programs.some(
        (program) =>
          program.audienceTags.includes(
            audience
          )
      )
  );
}
