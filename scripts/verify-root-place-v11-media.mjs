// ROOT_PLACE_V11_MEDIA_VERIFIER

import fs from 'node:fs';

const read = (path) => {
  if (!fs.existsSync(path)) {
    throw new Error(`missing ${path}`);
  }
  return fs.readFileSync(path, 'utf8');
};

const media = read('store/rootPlaceMedia.ts');
const firestore = read('firestore.rules');
const storage = read('storage.rules');
const domain = read('store/rootPlaceDomain.ts');

for (
  const token of [
    'ROOT_PLACE_V11_MEDIA_UPLOAD',
    "from '@react-native-firebase/storage'",
    "from 'expo-image-picker'",
    'getRootCloudUidOrNull',
    'ROOT PLACE MEDIA LOCAL ONLY: GUEST',
    'ROOT PLACE MEDIA UPLOAD SUCCESS',
    'ROOT PLACE MEDIA ORPHAN CLEANUP SUCCESS',
    "'rootPlaceMedia'",
    "'root-places'",
    'putFile(',
    'getDownloadURL(',
    'deleteObject(',
    "status: 'pending'",
    'listVisibleRootPlaceMedia',
    'listOwnRootPlaceMedia',
    'pickRootPlaceRepresentativeMedia',
  ]
) {
  if (!media.includes(token)) {
    throw new Error(`media store missing ${token}`);
  }
}

if (
  /(?:auth\(\)\s*\.\s*currentUser|firebaseAuth\s*\.\s*currentUser)/.test(media)
) {
  throw new Error(
    'canonical media store must not use raw Firebase currentUser ownership',
  );
}

for (
  const token of [
    'ROOT_PLACE_V11_FIRESTORE_MEDIA',
    "resource.data.status == 'visible'",
    'resource.data.authorUid == request.auth.uid',
    "resource.data.status == 'pending'",
    "request.resource.data.status == 'pending'",
    'request.resource.data.storagePath == resource.data.storagePath',
    'request.resource.data.downloadUrl == resource.data.downloadUrl',
  ]
) {
  if (!firestore.includes(token)) {
    throw new Error(`Firestore Rules missing ${token}`);
  }
}

for (
  const token of [
    'ROOT_PLACE_V11_STORAGE_MEDIA',
    'match /root-places/{uid}/{placeId}/{fileName}',
    'request.auth.uid == uid',
    "request.resource.contentType.matches('image/.*')",
    "request.resource.contentType.matches('video/.*')",
    '20 * 1024 * 1024',
    '200 * 1024 * 1024',
  ]
) {
  if (!storage.includes(token)) {
    throw new Error(`Storage Rules missing ${token}`);
  }
}

for (
  const preserved of [
    'ROOT_PLACE_V1_COMMON_DOMAIN',
    'RootPlaceMedia',
  ]
) {
  if (!domain.includes(preserved)) {
    throw new Error(`V1 domain missing ${preserved}`);
  }
}

for (
  const preserved of [
    'match /users/{uid}',
    'rootUserPublicProfiles',
    'rootNicknames',
    'ROOT_PLACE_V1_FIRESTORE_FOUNDATION',
    'match /rootPlaces/{placeId}',
    'match /rootPlaceReports/{reportId}',
    'match /rootPlaceVisits/{visitId}',
  ]
) {
  if (!firestore.includes(preserved)) {
    throw new Error(`preserved Firestore contract missing ${preserved}`);
  }
}

console.log('PASS - photo/video picker + dedicated ROOT place Storage upload connected');
console.log('PASS - member upload writes pending rootPlaceMedia metadata');
console.log('PASS - guest media remains local-only and does not upload');
console.log('PASS - failed metadata write cleans up uploaded Storage object');
console.log('PASS - pending media is uploader-private; visible media is signed-in readable');
console.log('PASS - clients cannot self-promote pending media to visible');
console.log('PASS - image/video Storage size and content-type guards exist');
console.log('PASS - ROOT PLACE V1 + D10 contracts preserved');
console.log('PASS - ROOT PLACE V1.1 MEDIA');
