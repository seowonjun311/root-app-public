import fs from 'node:fs';
import path from 'node:path';

const projectRoot =
  process.cwd();

const targets = {
  explore:
    path.join(
      projectRoot,
      'app',
      '(tabs)',
      'explore.tsx'
    ),

  district:
    path.join(
      projectRoot,
      'app',
      'explore',
      'district',
      '[districtId].tsx'
    ),

  facility:
    path.join(
      projectRoot,
      'app',
      'explore',
      'facility',
      '[facilityId].tsx'
    ),
};

function readFile(
  filePath
) {
  if (
    !fs.existsSync(filePath)
  ) {
    throw new Error(
      `파일을 찾지 못했습니다: ${filePath}`
    );
  }

  return fs
    .readFileSync(
      filePath,
      'utf8'
    )
    .replace(/^\uFEFF/, '');
}

function writeFile(
  filePath,
  source
) {
  fs.writeFileSync(
    filePath,
    source,
    'utf8'
  );
}

function insertImport(
  source,
  marker,
  importSource
) {
  if (
    source.includes(
      importSource
    )
  ) {
    return source;
  }

  if (
    !source.includes(
      marker
    )
  ) {
    throw new Error(
      `import 삽입 위치를 찾지 못했습니다: ${marker}`
    );
  }

  return source.replace(
    marker,
    `${marker}\n${importSource}`
  );
}

function insertHookCall(
  source
) {
  const hookCode =
    [
      '  const seoulReservationData =',
      '    useSeoulReservationData();',
    ].join('\n');

  if (
    source.includes(
      'useSeoulReservationData();'
    )
  ) {
    return source;
  }

  const insetsPattern =
    /  const insets\s*=\s*useSafeAreaInsets\(\);/;

  const matched =
    source.match(
      insetsPattern
    );

  if (!matched) {
    throw new Error(
      'useSafeAreaInsets 호출 위치를 찾지 못했습니다.'
    );
  }

  return source.replace(
    matched[0],
    `${matched[0]}\n\n${hookCode}`
  );
}

function findConstBlock(
  source,
  constName
) {
  const marker =
    `const ${constName} =`;

  const start =
    source.indexOf(marker);

  if (start < 0) {
    throw new Error(
      `${constName} 블록을 찾지 못했습니다.`
    );
  }

  const nextConst =
    source.indexOf(
      '\n  const ',
      start + marker.length
    );

  const end =
    nextConst >= 0
      ? nextConst
      : source.length;

  return {
    start,
    end,
    block:
      source.slice(
        start,
        end
      ),
  };
}

function patchDependency(
  source,
  constName,
  oldPattern,
  replacement
) {
  const declarationMarker =
    `const ${constName} =`;

  if (
    !source.includes(
      declarationMarker
    )
  ) {
    console.log(
      `건너뜀: ${constName} 블록이 현재 화면에 없습니다.`
    );

    return source;
  }

  const {
    start,
    end,
    block,
  } =
    findConstBlock(
      source,
      constName
    );

  if (
    block.includes(
      'seoulReservationData.revision'
    )
  ) {
    return source;
  }

  const nextBlock =
    block.replace(
      oldPattern,
      replacement
    );

  if (
    nextBlock === block
  ) {
    throw new Error(
      `${constName} 의존성 배열을 수정하지 못했습니다.`
    );
  }

  return (
    source.slice(0, start) +
    nextBlock +
    source.slice(end)
  );
}

function patchExplore() {
  let source =
    readFile(
      targets.explore
    );

  source =
    insertImport(
      source,
      "import { useRootTheme } from '../../store/rootTheme';",
      "import { useSeoulReservationData } from '../../store/seoulReservationRemote';"
    );

  source =
    insertHookCall(
      source
    );

  const zeroDependencyBlocks = [
    'insideSeoulCampingSummaries',
    'outsideSeoulCampingSummaries',
    'insideSeoulSportsSummaries',
    'outsideSeoulSportsSummaries',
    'seoulSpaceSummaries',
    'insideSeoulEducationSummaries',
    'outsideSeoulEducationSummaries',
  ];

  for (
    const constName of
      zeroDependencyBlocks
  ) {
    source =
      patchDependency(
        source,
        constName,
        /\[\s*\](\s*\);)/,
        '[seoulReservationData.revision]$1'
      );
  }

  writeFile(
    targets.explore,
    source
  );
}

function patchDistrict() {
  let source =
    readFile(
      targets.district
    );

  source =
    insertImport(
      source,
      "import { useRootTheme } from '../../../store/rootTheme';",
      "import { useSeoulReservationData } from '../../../store/seoulReservationRemote';"
    );

  source =
    insertHookCall(
      source
    );

  const districtBlocks = [
    'districtCampingFacilityItems',
    'districtSportsFacilityItems',
    'districtSpaceFacilityItems',
    'districtEducationFacilityItems',
  ];

  for (
    const constName of
      districtBlocks
  ) {
    source =
      patchDependency(
        source,
        constName,
        /\[\s*districtName\s*\]/,
        '[districtName, seoulReservationData.revision]'
      );
  }

  writeFile(
    targets.district,
    source
  );
}

function patchFacility() {
  let source =
    readFile(
      targets.facility
    );

  source =
    insertImport(
      source,
      "import { useRootTheme } from '../../../store/rootTheme';",
      "import { useSeoulReservationData } from '../../../store/seoulReservationRemote';"
    );

  source =
    insertHookCall(
      source
    );

  source =
    patchDependency(
      source,
      'detail',
      /\[\s*facilityId\s*,\s*kind\s*\]/,
      '[facilityId, kind, seoulReservationData.revision]'
    );

  writeFile(
    targets.facility,
    source
  );
}

patchExplore();
patchDistrict();
patchFacility();

console.log('');
console.log(
  '서울 예약 원격 데이터 화면 연결 완료'
);

console.log(
  '수정 화면:'
);

console.log(
  '  app/(tabs)/explore.tsx'
);

console.log(
  '  app/explore/district/[districtId].tsx'
);

console.log(
  '  app/explore/facility/[facilityId].tsx'
);