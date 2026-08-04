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
  getEducationCategoryLabel,
  getInsideSeoulEducationSummaries,
  getSeoulOperatedOutsideEducationSummaries,
} from '../../../store/seoulEducationSelectors';

export default function EducationFacilityListScreen() {
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
      ...getInsideSeoulEducationSummaries(),
      ...getSeoulOperatedOutsideEducationSummaries(),
    ];

    return summaries
      .filter((summary: any) =>
        matchesDistrict(
          summary?.place?.district,
          districtName
        )
      )
      .map((summary: any): FacilityListItem => {
        const place = summary.place ?? {};
        const program = summary.primaryProgram ?? null;
        const category = getText(place.primaryCategory);

        return {
          id: getText(place.id),
          kind: 'education',
          name: getText(place.name) || '교육·체험 장소',
          icon: getEducationIcon(category),
          district: getText(place.district) || '지역 확인',
          categoryLabel: getEducationCategoryLabel(place.primaryCategory),
          statusLabel: getText(summary.statusLabel) || '상태 확인',
          reservationCount: Number(
            place.programCount ??
            place.programs?.length ??
            0
          ),
          receptionText: formatReception(
            program?.receptionStartAt,
            program?.receptionEndAt
          ),
          paidType: getText(program?.paidType) || '요금 확인',
          primaryTitle: getText(program?.title),
          reservationUrl:
            getText(program?.serviceUrl) ||
            getText(place.officialUrl),
        };
      })
      .sort((first, second) =>
        first.name.localeCompare(second.name, 'ko')
      );
  }, [districtName]);

  return (
    <FacilityListView
      title={`${districtLabel} 교육·체험`}
      subtitle="교육·체험 데이터만 불러왔어요."
      districtLabel={districtLabel}
      items={items}
    />
  );
}
