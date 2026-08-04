import {
  useLocalSearchParams,
} from 'expo-router';
import {
  useMemo,
} from 'react';

import FacilityListView from '../../../components/explore/FacilityListView';
import {
  formatReception,
  getEducationIcon,
  getParam,
  getSpaceIcon,
  getSportsIcon,
  getText,
  matchesDistrict,
  type FacilityListItem,
} from '../../../components/explore/facilityModels';
import {
  getExplorationDistrict,
} from '../../../store/explorationCatalog';
import {
  getSpaceFacilitySummaries,
  getSpaceKindLabel,
  getSpaceStatusLabel,
} from '../../../store/seoulSpaceSelectors';

export default function SpaceFacilityListScreen() {
  const { districtId: rawDistrictId } =
    useLocalSearchParams<{
      districtId?: string | string[];
    }>();

  const districtId = getParam(rawDistrictId);
  const district = districtId && districtId !== 'all'
    ? getExplorationDistrict(districtId)
    : null;
  const districtName = getText(district?.name);
  const districtLabel = districtName || '서울 전체';

  const items = useMemo<FacilityListItem[]>(() => {
    return getSpaceFacilitySummaries()
      .filter((summary: any) =>
        matchesDistrict(
          summary?.facility?.district,
          districtName
        )
      )
      .map((summary: any): FacilityListItem => {
        const facility = summary.facility ?? {};
        const reservation = summary.primaryReservation ?? null;
        const spaceKind = getText(facility.spaceKind);

        return {
          id: getText(facility.id),
          kind: 'space',
          name: getText(facility.name) || '공간대관 시설',
          icon: getSpaceIcon(spaceKind),
          district: getText(facility.district) || '지역 확인',
          categoryLabel: getSpaceKindLabel(facility.spaceKind),
          statusLabel:
            getText(summary.statusLabel) ||
            getSpaceStatusLabel(summary.status),
          reservationCount: Number(
            facility.reservationCount ??
            facility.reservations?.length ??
            0
          ),
          receptionText: formatReception(
            reservation?.receptionStartAt,
            reservation?.receptionEndAt
          ),
          paidType: getText(reservation?.paidType) || '요금 확인',
          primaryTitle: getText(reservation?.title),
          reservationUrl:
            getText(reservation?.serviceUrl) ||
            getText(facility.officialUrl),
        };
      })
      .sort((first, second) =>
        first.name.localeCompare(second.name, 'ko')
      );
  }, [districtName]);

  return (
    <FacilityListView
      title={`${districtLabel} 공간대관`}
      subtitle="공간대관 데이터만 불러왔어요."
      districtLabel={districtLabel}
      items={items}
    />
  );
}
