// ROOT_PLACE_V11_MEDIA_UPLOAD

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getApp,
} from '@react-native-firebase/app';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  where,
} from '@react-native-firebase/firestore';

import {
  deleteObject,
  getDownloadURL,
  getStorage,
  putFile,
  ref as storageRef,
} from '@react-native-firebase/storage';

import * as ImagePicker from 'expo-image-picker';

import {
  getRootCloudUidOrNull,
} from './rootCloudSession';

import type {
  RootPlaceMedia,
  RootPlaceMediaKind,
} from './rootPlaceDomain';

const ROOT_PLACE_MEDIA_COLLECTION =
  'rootPlaceMedia';

const ROOT_PLACE_GUEST_MEDIA_DRAFTS_KEY =
  'root_place_guest_media_drafts_v1';

const PHOTO_MAX_BYTES =
  20 * 1024 * 1024;

const VIDEO_MAX_BYTES =
  200 * 1024 * 1024;

const MAX_GUEST_DRAFTS =
  40;

export type RootPlaceMediaDraft = {
  version: 1;
  draftId: string;
  placeId: string;
  kind: RootPlaceMediaKind;
  localUri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  capturedAt?: string | null;
  visitedAt?: string | null;
  createdAt: string;
};

export type PickAndUploadRootPlaceMediaOptions = {
  visitedAt?: string | null;
};

export type RootPlaceMediaUploadResult =
  | {
      mode: 'guest-local';
      canceled: false;
      draft: RootPlaceMediaDraft;
      media: null;
    }
  | {
      mode: 'cloud';
      canceled: false;
      draft: null;
      media: RootPlaceMedia;
    }
  | {
      mode: 'canceled';
      canceled: true;
      draft: null;
      media: null;
    };

const clean = (
  value: unknown,
) =>
  String(value ?? '').trim();

const createId = (
  prefix: string,
) =>
  [
    prefix,
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2, 10),
  ].join('_');

const sanitizeStorageSegment = (
  value: unknown,
) => {
  const safe =
    clean(value)
      .normalize('NFKC')
      .replace(
        /[^0-9A-Za-z_-]/g,
        '_',
      )
      .replace(
        /_+/g,
        '_',
      )
      .slice(0, 120);

  return safe || 'unknown';
};

const toPutFilePath = (
  uri: string,
) =>
  uri.startsWith('file://')
    ? decodeURI(uri.slice(7))
    : uri;

const getExtension = (
  asset: ImagePicker.ImagePickerAsset,
  kind: RootPlaceMediaKind,
) => {
  const fileName = clean(asset.fileName);
  const uri = clean(asset.uri);

  const from =
    (fileName || uri.split('?')[0])
      .split('.')
      .pop()
      ?.toLocaleLowerCase('en-US') ??
    '';

  const safe =
    from.replace(/[^0-9a-z]/g, '');

  if (
    safe.length >= 2 &&
    safe.length <= 6
  ) {
    return safe;
  }

  return kind === 'video'
    ? 'mp4'
    : 'jpg';
};

const getContentType = (
  asset: ImagePicker.ImagePickerAsset,
  kind: RootPlaceMediaKind,
  extension: string,
) => {
  const provided = clean(asset.mimeType);

  if (
    kind === 'image' &&
    provided.startsWith('image/')
  ) {
    return provided;
  }

  if (
    kind === 'video' &&
    provided.startsWith('video/')
  ) {
    return provided;
  }

  if (kind === 'video') {
    return extension === 'mov'
      ? 'video/quicktime'
      : 'video/mp4';
  }

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  if (
    extension === 'heic' ||
    extension === 'heif'
  ) {
    return 'image/heic';
  }

  return 'image/jpeg';
};

const assertAssetSize = (
  asset: ImagePicker.ImagePickerAsset,
  kind: RootPlaceMediaKind,
) => {
  const size =
    typeof asset.fileSize === 'number' &&
    Number.isFinite(asset.fileSize)
      ? asset.fileSize
      : null;

  if (size === null) {
    return;
  }

  if (
    kind === 'image' &&
    size > PHOTO_MAX_BYTES
  ) {
    throw new Error(
      'ROOT_PLACE_PHOTO_TOO_LARGE',
    );
  }

  if (
    kind === 'video' &&
    size > VIDEO_MAX_BYTES
  ) {
    throw new Error(
      'ROOT_PLACE_VIDEO_TOO_LARGE',
    );
  }
};

const readGuestDrafts =
  async (): Promise<
    RootPlaceMediaDraft[]
  > => {
    try {
      const raw =
        await AsyncStorage.getItem(
          ROOT_PLACE_GUEST_MEDIA_DRAFTS_KEY,
        );

      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  };

const saveGuestDraft =
  async (
    draft: RootPlaceMediaDraft,
  ) => {
    const current =
      await readGuestDrafts();

    await AsyncStorage.setItem(
      ROOT_PLACE_GUEST_MEDIA_DRAFTS_KEY,
      JSON.stringify(
        [
          draft,
          ...current,
        ].slice(
          0,
          MAX_GUEST_DRAFTS,
        ),
      ),
    );
  };

export async function loadGuestRootPlaceMediaDrafts() {
  return readGuestDrafts();
}

export async function clearGuestRootPlaceMediaDraft(
  draftId: string,
) {
  const current =
    await readGuestDrafts();

  await AsyncStorage.setItem(
    ROOT_PLACE_GUEST_MEDIA_DRAFTS_KEY,
    JSON.stringify(
      current.filter(
        (item) =>
          item.draftId !== draftId,
      ),
    ),
  );
}

export async function pickAndUploadRootCanonicalPlaceMedia(
  placeId: string,
  options: PickAndUploadRootPlaceMediaOptions =
    {},
): Promise<RootPlaceMediaUploadResult> {
  const safePlaceId = clean(placeId);

  if (!safePlaceId) {
    throw new Error(
      'ROOT_PLACE_MEDIA_PLACE_ID_REQUIRED',
    );
  }

  const permission =
    await ImagePicker
      .requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      'ROOT_PLACE_MEDIA_PERMISSION_REQUIRED',
    );
  }

  const result =
    await ImagePicker
      .launchImageLibraryAsync({
        mediaTypes: [
          'images',
          'videos',
        ],
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.9,
      });

  if (
    result.canceled ||
    !result.assets?.[0]
  ) {
    return {
      mode: 'canceled',
      canceled: true,
      draft: null,
      media: null,
    };
  }

  const asset = result.assets[0];

  const kind: RootPlaceMediaKind =
    asset.type === 'video'
      ? 'video'
      : 'image';

  assertAssetSize(
    asset,
    kind,
  );

  const now =
    new Date().toISOString();

  const uid =
    getRootCloudUidOrNull();

  if (!uid) {
    const draft:
      RootPlaceMediaDraft = {
      version: 1,
      draftId:
        createId('media_draft'),
      placeId: safePlaceId,
      kind,
      localUri: asset.uri,
      mimeType:
        asset.mimeType ?? null,
      fileName:
        asset.fileName ?? null,
      fileSize:
        typeof asset.fileSize ===
          'number'
          ? asset.fileSize
          : null,
      capturedAt: null,
      visitedAt:
        options.visitedAt ?? null,
      createdAt: now,
    };

    await saveGuestDraft(draft);

    console.log(
      'ROOT PLACE MEDIA LOCAL ONLY: GUEST',
      {
        draftId: draft.draftId,
        placeId: safePlaceId,
        kind,
      },
    );

    return {
      mode: 'guest-local',
      canceled: false,
      draft,
      media: null,
    };
  }

  const mediaId =
    createId('media');

  const extension =
    getExtension(asset, kind);

  const contentType =
    getContentType(
      asset,
      kind,
      extension,
    );

  const storagePath =
    [
      'root-places',
      sanitizeStorageSegment(uid),
      sanitizeStorageSegment(
        safePlaceId,
      ),
      `${sanitizeStorageSegment(
        mediaId,
      )}.${extension}`,
    ].join('/');

  const fileReference =
    storageRef(
      getStorage(),
      storagePath,
    );

  let uploaded = false;

  try {
    await putFile(
      fileReference,
      toPutFilePath(asset.uri),
      {
        contentType,
      },
    );

    uploaded = true;

    const downloadUrl =
      await getDownloadURL(
        fileReference,
      );

    const media:
      RootPlaceMedia = {
      version: 1,
      mediaId,
      placeId: safePlaceId,
      authorUid: uid,
      kind,
      source: 'user',
      status: 'pending',
      storagePath,
      downloadUrl,
      thumbnailUrl: null,
      capturedAt: null,
      visitedAt:
        options.visitedAt ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(
      doc(
        getFirestore(getApp()),
        ROOT_PLACE_MEDIA_COLLECTION,
        mediaId,
      ),
      media,
    );

    console.log(
      'ROOT PLACE MEDIA UPLOAD SUCCESS',
      {
        mediaId,
        placeId: safePlaceId,
        kind,
        storagePath,
        status: media.status,
      },
    );

    return {
      mode: 'cloud',
      canceled: false,
      draft: null,
      media,
    };
  } catch (error) {
    if (uploaded) {
      try {
        await deleteObject(
          fileReference,
        );

        console.log(
          'ROOT PLACE MEDIA ORPHAN CLEANUP SUCCESS',
          { storagePath },
        );
      } catch (cleanupError) {
        console.log(
          'ROOT PLACE MEDIA ORPHAN CLEANUP ERROR',
          {
            storagePath,
            cleanupError,
          },
        );
      }
    }

    throw error;
  }
}

const fromSnapshot = (
  snapshot: any,
): RootPlaceMedia => ({
  ...(snapshot.data() as RootPlaceMedia),
  mediaId: String(snapshot.id),
});

const sortNewest = (
  first: RootPlaceMedia,
  second: RootPlaceMedia,
) =>
  new Date(second.createdAt).getTime() -
  new Date(first.createdAt).getTime();

export async function listVisibleRootPlaceMedia(
  placeId: string,
  maxResults = 100,
): Promise<RootPlaceMedia[]> {
  const safePlaceId = clean(placeId);

  if (!safePlaceId) {
    return [];
  }

  const snapshot =
    await getDocs(
      query(
        collection(
          getFirestore(getApp()),
          ROOT_PLACE_MEDIA_COLLECTION,
        ),
        where(
          'placeId',
          '==',
          safePlaceId,
        ),
        where(
          'status',
          '==',
          'visible',
        ),
        limit(
          Math.min(
            200,
            Math.max(
              1,
              Math.floor(maxResults),
            ),
          ),
        ),
      ),
    );

  return snapshot.docs
    .map(fromSnapshot)
    .sort(sortNewest);
}

export async function listOwnRootPlaceMedia(
  placeId: string,
  maxResults = 100,
): Promise<RootPlaceMedia[]> {
  const uid =
    getRootCloudUidOrNull();

  if (!uid) {
    return [];
  }

  const safePlaceId = clean(placeId);

  if (!safePlaceId) {
    return [];
  }

  const snapshot =
    await getDocs(
      query(
        collection(
          getFirestore(getApp()),
          ROOT_PLACE_MEDIA_COLLECTION,
        ),
        where(
          'placeId',
          '==',
          safePlaceId,
        ),
        where(
          'authorUid',
          '==',
          uid,
        ),
        limit(
          Math.min(
            200,
            Math.max(
              1,
              Math.floor(maxResults),
            ),
          ),
        ),
      ),
    );

  return snapshot.docs
    .map(fromSnapshot)
    .sort(sortNewest);
}

export async function deleteOwnRootPlaceMedia(
  media: RootPlaceMedia,
) {
  const uid =
    getRootCloudUidOrNull();

  if (
    !uid ||
    media.authorUid !== uid
  ) {
    throw new Error(
      'ROOT_PLACE_MEDIA_SELF_ONLY_REQUIRED',
    );
  }

  if (clean(media.storagePath)) {
    await deleteObject(
      storageRef(
        getStorage(),
        media.storagePath,
      ),
    );
  }

  await deleteDoc(
    doc(
      getFirestore(getApp()),
      ROOT_PLACE_MEDIA_COLLECTION,
      media.mediaId,
    ),
  );
}

export function pickRootPlaceRepresentativeMedia(
  mediaItems: readonly RootPlaceMedia[],
): RootPlaceMedia | null {
  const visible =
    mediaItems
      .filter(
        (item) =>
          item.status === 'visible',
      )
      .slice()
      .sort(sortNewest);

  return (
    visible.find(
      (item) =>
        item.kind === 'image',
    ) ??
    visible.find(
      (item) =>
        item.kind === 'video',
    ) ??
    null
  );
}
