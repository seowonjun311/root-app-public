# ROOT PLACE V1.1 ???ъ쭊 쨌 ?숈쁺??Storage + rootPlaceMedia

## Baseline

- ROOT PLACE V1.0: `3a330698b85c9d0f10f652c02bb9a2874783767a`
- Firestore Rules before V1.1:
  `3956AD5A7DD0CA0BA4B60193FEB180BB8E9F2F00846341ECCE822E7DAF615F3E`

## ?뚯썝 ?낅줈??

```text
?μ냼
???ъ쭊/?숈쁺???좏깮
??root-places/{uid}/{placeId}/{mediaId}.{ext}
??Firebase Storage
??download URL
??rootPlaceMedia/{mediaId}
??status = pending
```

## 寃뚯뒪??

寃뚯뒪?몃뒗 Storage/Firestore???곗? ?딅뒗??
?좏깮??media??`root_place_guest_media_drafts_v1` local draft?먮쭔 蹂닿??쒕떎.

## Firestore

- pending: ?묒꽦?먮쭔 議고쉶
- visible: 濡쒓렇???ъ슜??議고쉶
- create: 蹂몄씤 uid + user source + pending
- update: pending ?곹깭? immutable identity/storage fields ?좎?
- pending ??visible client self-promotion 湲덉?
- delete: 蹂몄씤 ?낅줈?쒕쭔

## Storage

- dedicated path: `root-places/{uid}/{placeId}/{fileName}`
- 蹂몄씤 uid path留?write/delete
- image: 理쒕? 20 MiB
- video: 理쒕? 200 MiB
- `image/*` / `video/*`
- read: signed-in

## ?뺥빀??

Storage upload ??Firestore metadata ??μ씠 ?ㅽ뙣?섎㈃ 諛⑷툑 ?낅줈?쒗븳
Storage object瑜?利됱떆 ??젣?섏뿬 orphan ?뚯씪???④린吏 ?딅뒗??

## 議고쉶

- `listVisibleRootPlaceMedia(placeId)`
- `listOwnRootPlaceMedia(placeId)`
- `pickRootPlaceRepresentativeMedia(mediaItems)`

???誘몃뵒??foundation? 理쒖떊 visible image瑜??곗꽑?섍퀬, ?놁쑝硫?理쒖떊 visible video瑜??좏깮?쒕떎.

## ?ㅼ쓬 V1.2

- ?꾩옱 ?μ냼 移대뱶???쒖궗吏?異붽??섍린??踰꾪듉??canonical V1.1 API???곌껐
- ?ъ쭊/?숈쁺???쇰뱶 UI
- pending ??visible moderator ?뱀씤 ?뚯씠?꾨씪??
- 怨듭떇 ??쒖씠誘몄? ?밴꺽
