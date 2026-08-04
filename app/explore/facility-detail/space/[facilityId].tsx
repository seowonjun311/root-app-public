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
  getSpaceFacilitySummaries,
  getSpaceKindLabel,
  getSpaceStatusLabel,
} from '../../../../store/seoulSpaceSelectors';

export default function SpaceFacilityDetailScreen() {
  const { facilityId: rawFacilityId } =
    useLocalSearchParams<{
      facilityId?: string | string[];
    }>();
  const facilityId = getParam(rawFacilityId);

  const detail = useMemo<FacilityDetailData | null>(() => {
    const summary = getSpaceFacilitySummaries().find(
      (item: any) =>
        getText(item?.facility?.id) === facilityId
    );

    if (!summary) return null;

    const facility = summary.facility ?? {};
    const reservation = summary.primaryReservation ?? null;
    const officialUrl =
      getText(reservation?.serviceUrl) ||
      getText(facility.officialUrl);

    return {
      kind: 'space',
      facilityId,
      name: getText(facility.name) || '공간대관 시설',
      icon: getSpaceIcon(getText(facility.spaceKind)),
      district: getText(facility.district) || '지역 확인',
      locationLabel:
        getText(facility.locationLabel) ||
        `서울 ${getText(facility.district)}`.trim() ||
        '위치 확인',
      categoryLabel: getSpaceKindLabel(facility.spaceKind),
      statusLabel:
        getText(summary.statusLabel) ||
        getSpaceStatusLabel(summary.status),
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
