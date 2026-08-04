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
  getInsideSeoulSportsSummaries,
  getSeoulOperatedOutsideSportsSummaries,
  getSportsStatusLabel,
} from '../../../../store/seoulSportsSelectors';

export default function SportsFacilityDetailScreen() {
  const { facilityId: rawFacilityId } =
    useLocalSearchParams<{
      facilityId?: string | string[];
    }>();
  const facilityId = getParam(rawFacilityId);

  const detail = useMemo<FacilityDetailData | null>(() => {
    const summary = [
      ...getInsideSeoulSportsSummaries(),
      ...getSeoulOperatedOutsideSportsSummaries(),
    ].find((item: any) =>
      getText(item?.facility?.id) === facilityId
    );

    if (!summary) return null;

    const facility = summary.facility ?? {};
    const reservation = summary.primaryReservation ?? null;
    const category = getText(facility.primaryCategory) || '체육시설';
    const officialUrl =
      getText(reservation?.serviceUrl) ||
      getText(facility.officialUrl);

    return {
      kind: 'sports',
      facilityId,
      name: getText(facility.name) || '체육시설',
      icon: getSportsIcon(category),
      district: getText(facility.district) || '지역 확인',
      locationLabel:
        getText(facility.locationLabel) ||
        getText(facility.district) ||
        '위치 확인',
      categoryLabel: category,
      statusLabel:
        getText(summary.statusLabel) ||
        getSportsStatusLabel(summary.status),
      reservationCount: Number(
        facility.reservationCount ??
        facility.reservations?.length ??
        0
      ),
      itemLabel: '예약상품',
      coordinate: getCoordinate(facility),
      officialUrl,
      reservations: normalizeReservations(
        facility.reservations,
        facilityId,
        officialUrl
      ),
    };
  }, [facilityId]);

  return <FacilityDetailView detail={detail} />;
}
