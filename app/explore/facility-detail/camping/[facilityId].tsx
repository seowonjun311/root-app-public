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
  getCampingStatusLabel,
  getInsideSeoulCampingSummaries,
  getSeoulOperatedOutsideCampingSummaries,
} from '../../../../store/seoulCampingSelectors';

export default function CampingFacilityDetailScreen() {
  const { facilityId: rawFacilityId } =
    useLocalSearchParams<{
      facilityId?: string | string[];
    }>();
  const facilityId = getParam(rawFacilityId);

  const detail = useMemo<FacilityDetailData | null>(() => {
    const summary = [
      ...getInsideSeoulCampingSummaries(),
      ...getSeoulOperatedOutsideCampingSummaries(),
    ].find((item: any) =>
      getText(item?.facility?.id) === facilityId
    );

    if (!summary) return null;

    const facility = summary.facility ?? {};
    const reservation = summary.primaryReservation ?? null;
    const officialUrl =
      getText(reservation?.reservationUrl) ||
      getText(facility.officialUrl);

    return {
      kind: 'camping',
      facilityId,
      name: getText(facility.name) || '캠핑·피크닉 시설',
      icon: facility.facilityKind === 'picnic' ? '🧺' : '🏕️',
      district: getText(facility.district) || '지역 확인',
      locationLabel:
        getText(facility.locationLabel) ||
        getText(facility.district) ||
        '위치 확인',
      categoryLabel: facility.facilityKind === 'picnic'
        ? '피크닉장'
        : '캠핑장',
      statusLabel: getCampingStatusLabel(summary.primaryStatus),
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
