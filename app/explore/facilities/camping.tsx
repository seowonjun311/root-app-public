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
  getCampingStatusLabel,
  getInsideSeoulCampingSummaries,
  getSeoulOperatedOutsideCampingSummaries,
} from '../../../store/seoulCampingSelectors';

export default function CampingFacilityListScreen() {
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
    const summaries = [
      ...getInsideSeoulCampingSummaries(),
      ...getSeoulOperatedOutsideCampingSummaries(),
    ];

    return summaries
      .filter((summary: any) =>
        matchesDistrict(
          summary?.facility?.district,
          districtName
        )
      )
      .map((summary: any): FacilityListItem => {
        const facility = summary.facility ?? {};
        const reservation = summary.primaryReservation ?? null;
        const kindLabel = facility.facilityKind === 'picnic'
          ? '피크닉장'
          : '캠핑장';

        return {
          id: getText(facility.id),
          kind: 'camping',
          name: getText(facility.name) || '캠핑·피크닉 시설',
          icon: facility.facilityKind === 'picnic' ? '🧺' : '🏕️',
          district: getText(facility.district) || '지역 확인',
          categoryLabel: kindLabel,
          statusLabel: getCampingStatusLabel(summary.primaryStatus),
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
            getText(reservation?.reservationUrl) ||
            getText(facility.officialUrl),
        };
      })
      .sort((first, second) =>
        first.name.localeCompare(second.name, 'ko')
      );
  }, [districtName]);

  return (
    <FacilityListView
      title={`${districtLabel} 캠핑·피크닉`}
      subtitle="캠핑과 피크닉 데이터만 불러왔어요."
      districtLabel={districtLabel}
      items={items}
    />
  );
}
