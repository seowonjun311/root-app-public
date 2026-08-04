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
  getInsideSeoulSportsSummaries,
  getSeoulOperatedOutsideSportsSummaries,
  getSportsStatusLabel,
} from '../../../store/seoulSportsSelectors';

export default function SportsFacilityListScreen() {
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
      ...getInsideSeoulSportsSummaries(),
      ...getSeoulOperatedOutsideSportsSummaries(),
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
        const category = getText(facility.primaryCategory) || '체육시설';

        return {
          id: getText(facility.id),
          kind: 'sports',
          name: getText(facility.name) || '체육시설',
          icon: getSportsIcon(category),
          district: getText(facility.district) || '지역 확인',
          categoryLabel: category,
          statusLabel:
            getText(summary.statusLabel) ||
            getSportsStatusLabel(summary.status),
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
      title={`${districtLabel} 체육시설`}
      subtitle="체육시설 데이터만 불러왔어요."
      districtLabel={districtLabel}
      items={items}
    />
  );
}
