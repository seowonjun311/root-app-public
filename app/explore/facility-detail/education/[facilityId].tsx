import {
  useLocalSearchParams,
} from 'expo-router';
import {
  useMemo,
} from 'react';

import FacilityDetailView from '../../../../components/explore/FacilityDetailView';
import {
  getCoordinate,
  getEducationIcon,
  getParam,
  getSpaceIcon,
  getSportsIcon,
  getText,
  normalizeReservations,
  type FacilityDetailData,
} from '../../../../components/explore/facilityModels';
import {
  getEducationCategoryLabel,
  getInsideSeoulEducationSummaries,
  getSeoulOperatedOutsideEducationSummaries,
} from '../../../../store/seoulEducationSelectors';

export default function EducationFacilityDetailScreen() {
  const { facilityId: rawFacilityId } =
    useLocalSearchParams<{
      facilityId?: string | string[];
    }>();
  const facilityId = getParam(rawFacilityId);

  const detail = useMemo<FacilityDetailData | null>(() => {
    const summary = [
      ...getInsideSeoulEducationSummaries(),
      ...getSeoulOperatedOutsideEducationSummaries(),
    ].find((item: any) =>
      getText(item?.place?.id) === facilityId
    );

    if (!summary) return null;

    const place = summary.place ?? {};
    const program = summary.primaryProgram ?? null;
    const officialUrl =
      getText(program?.serviceUrl) ||
      getText(place.officialUrl);

    return {
      kind: 'education',
      facilityId,
      name: getText(place.name) || '교육·체험 장소',
      icon: getEducationIcon(getText(place.primaryCategory)),
      district:
        getText(place.district) ||
        getText(place.locationLabel) ||
        '지역 확인',
      locationLabel:
        getText(place.locationLabel) ||
        getText(place.district) ||
        '위치 확인',
      categoryLabel: getEducationCategoryLabel(place.primaryCategory),
      statusLabel: getText(summary.statusLabel) || '상태 확인',
      reservationCount: Number(
        place.programCount ??
        place.programs?.length ??
        0
      ),
      itemLabel: '교육 프로그램',
      coordinate: getCoordinate(place),
      officialUrl,
      reservations: normalizeReservations(
        place.programs,
        facilityId,
        officialUrl
      ),
    };
  }, [facilityId]);

  return <FacilityDetailView detail={detail} />;
}
