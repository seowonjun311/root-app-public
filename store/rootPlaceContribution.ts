// ROOT_PLACE_V1_CONTRIBUTION_FOUNDATION

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getApp,
} from '@react-native-firebase/app';
import {
  collection,
  doc,
  getFirestore,
  setDoc,
} from '@react-native-firebase/firestore';

import {
  getRootCloudUidOrNull,
} from './rootCloudSession';

import type {
  RootPlaceReport,
  RootPlaceReportKind,
  RootPlaceVisit,
} from './rootPlaceDomain';

const ROOT_PLACE_REPORTS_COLLECTION =
  'rootPlaceReports';

const ROOT_PLACE_VISITS_COLLECTION =
  'rootPlaceVisits';

const GUEST_REPORT_QUEUE_KEY =
  'root_place_guest_reports_v1';

const GUEST_VISITS_KEY =
  'root_place_guest_visits_v1';

const createId = (
  prefix: string,
) =>
  [
    prefix,
    Date.now()
      .toString(
        36,
      ),
    Math.random()
      .toString(
        36,
      )
      .slice(
        2,
        10,
      ),
  ].join(
    '_',
  );

const readArray = async <T>(
  key: string,
): Promise<T[]> => {
  try {
    const raw =
      await AsyncStorage.getItem(
        key,
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(
        raw,
      );

    return Array.isArray(
      parsed,
    )
      ? parsed
      : [];
  }
  catch {
    return [];
  }
};

const appendLocal = async <T>(
  key: string,
  value: T,
) => {
  const current =
    await readArray<T>(
      key,
    );

  await AsyncStorage.setItem(
    key,
    JSON.stringify(
      [
        value,
        ...current,
      ].slice(
        0,
        200,
      ),
    ),
  );
};

export type SubmitRootPlaceReportInput = {
  placeId?: string | null;
  kind: RootPlaceReportKind;
  value?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mediaIds?: string[];
};

export async function submitRootPlaceReport(
  input: SubmitRootPlaceReportInput,
): Promise<{
  mode: 'cloud' | 'guest-local';
  report: RootPlaceReport;
}> {
  const uid =
    getRootCloudUidOrNull();

  const now =
    new Date().toISOString();

  const reportId =
    createId(
      'report',
    );

  const report:
    RootPlaceReport = {
    version:
      1,
    reportId,
    placeId:
      input.placeId ??
      null,
    authorUid:
      uid ??
      'guest-local',
    kind:
      input.kind,
    status:
      'pending',
    value:
      input.value ??
      null,
    latitude:
      input.latitude ??
      null,
    longitude:
      input.longitude ??
      null,
    mediaIds:
      Array.from(
        new Set(
          input.mediaIds ??
          [],
        ),
      ),
    createdAt:
      now,
    updatedAt:
      now,
  };

  if (!uid) {
    await appendLocal(
      GUEST_REPORT_QUEUE_KEY,
      report,
    );

    console.log(
      'ROOT PLACE REPORT LOCAL ONLY: GUEST',
      {
        reportId,
        kind:
          report.kind,
      },
    );

    return {
      mode:
        'guest-local',
      report,
    };
  }

  await setDoc(
    doc(
      getFirestore(
        getApp(),
      ),
      ROOT_PLACE_REPORTS_COLLECTION,
      reportId,
    ),
    report,
  );

  return {
    mode:
      'cloud',
    report,
  };
}

export type RecordRootPlaceVisitInput = {
  placeId: string;
  visitedAt?: string;
  latitude?: number | null;
  longitude?: number | null;
  gpsVerified?: boolean;
  mediaIds?: string[];
  note?: string | null;
};

export async function recordRootPlaceVisit(
  input: RecordRootPlaceVisitInput,
): Promise<{
  mode: 'cloud' | 'guest-local';
  visit: RootPlaceVisit;
}> {
  const uid =
    getRootCloudUidOrNull();

  const now =
    new Date().toISOString();

  const visitId =
    createId(
      'visit',
    );

  const visit:
    RootPlaceVisit = {
    version:
      1,
    visitId,
    placeId:
      String(
        input.placeId ??
        '',
      ).trim(),
    authorUid:
      uid ??
      'guest-local',
    visitedAt:
      input.visitedAt ??
      now,
    latitude:
      input.latitude ??
      null,
    longitude:
      input.longitude ??
      null,
    gpsVerified:
      input.gpsVerified ===
      true,
    mediaIds:
      Array.from(
        new Set(
          input.mediaIds ??
          [],
        ),
      ),
    note:
      input.note ??
      null,
    createdAt:
      now,
    updatedAt:
      now,
  };

  if (!visit.placeId) {
    throw new Error(
      'ROOT_PLACE_VISIT_PLACE_ID_REQUIRED',
    );
  }

  if (!uid) {
    await appendLocal(
      GUEST_VISITS_KEY,
      visit,
    );

    console.log(
      'ROOT PLACE VISIT LOCAL ONLY: GUEST',
      {
        visitId,
        placeId:
          visit.placeId,
      },
    );

    return {
      mode:
        'guest-local',
      visit,
    };
  }

  await setDoc(
    doc(
      getFirestore(
        getApp(),
      ),
      ROOT_PLACE_VISITS_COLLECTION,
      visitId,
    ),
    visit,
  );

  return {
    mode:
      'cloud',
    visit,
  };
}

export async function loadGuestRootPlaceReports() {
  return readArray<RootPlaceReport>(
    GUEST_REPORT_QUEUE_KEY,
  );
}

export async function loadGuestRootPlaceVisits() {
  return readArray<RootPlaceVisit>(
    GUEST_VISITS_KEY,
  );
}
