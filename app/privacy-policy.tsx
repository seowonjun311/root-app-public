import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRootTheme } from '../store/rootTheme';

export default function PrivacyPolicyScreen() {
  const { themeMode, theme } = useRootTheme();
  const isCityBlack = themeMode === 'cityBlack';

  const cardTheme = {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
};

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
     <View
  style={[
    styles.header,
    {
      backgroundColor:
        theme.background,
    },
  ]}
>
  <Text
    style={[
      styles.headerTitle,
      {
        color:
          theme.text,
      },
    ]}
  >
    개인정보처리방침
  </Text>

  <Pressable
    onPress={() =>
      router.back()
    }
    style={({ pressed }) => [
      styles.backButton,
      {
        backgroundColor:
          'transparent',

        borderColor:
          theme.line,

        borderWidth:
          0.5,

        borderRadius:
          isCityBlack
            ? 4
            : 10,

        opacity:
          pressed
            ? 0.6
            : 1,
      },
    ]}
  >
    <Ionicons
      name="arrow-back"
      size={19}
      color={theme.text}
    />
  </Pressable>
</View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.noticeCard,
            {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
},
          ]}
        >
          <Text
            style={[
              styles.noticeText,
              { color: theme.text },
            ]}
          >
            루트(Root) 앱은 사용자의 개인정보를
            소중하게 여기며 「개인정보 보호법」 및
            관련 법령을 준수합니다.
          </Text>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          1. 수집하는 개인정보 항목
        </Text>

        <View style={[styles.sectionCard, cardTheme]}>
          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 이메일 주소 (회원가입 및 Google 로그인 시)
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 닉네임 (사용자가 직접 입력)
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 결과목표 및 행동목표 데이터
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 목표 수행 기록 및 통계 데이터
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • GPS 이동거리 기록 (사용자가 권한을 허용한 경우)
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 목표 수행 인증 사진 (사용자가 직접 업로드한 경우)
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 알림 설정 정보
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 앱 이용 기록
          </Text>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          2. 개인정보 수집 및 이용 목적
        </Text>

        <View style={[styles.sectionCard, cardTheme]}>
          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 회원 식별 및 계정 관리
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 목표 및 행동 기록 저장
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 통계 및 성장 데이터 제공
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 사용자 맞춤 서비스 제공
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 서비스 개선 및 오류 수정
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 고객 문의 응대
          </Text>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          3. 개인정보 보유 및 이용 기간
        </Text>

        <View style={[styles.sectionCard, cardTheme]}>
          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 회원 탈퇴 또는 삭제 요청 시 개인정보 및 기록 데이터는
            지체 없이 삭제됩니다.
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 관계 법령에 따라 보관이 필요한 경우를 제외하고
            보유 목적 달성 후 즉시 파기합니다.
          </Text>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          4. 개인정보의 제3자 제공
        </Text>

        <View style={[styles.sectionCard, cardTheme]}>
          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 루트 앱은 사용자의 개인정보를 원칙적으로
            외부에 제공하지 않습니다.
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 사용자가 사전에 동의한 경우
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 법령에 의하여 제공 의무가 발생한 경우
          </Text>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          5. 개인정보 처리 위탁
        </Text>

        <View style={[styles.sectionCard, cardTheme]}>
          <Text style={[styles.bodyText, { color: theme.subText }]}>
            루트 앱은 서비스 운영을 위해 Google Firebase를
            이용할 수 있습니다.
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 제공업체: Google LLC
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 이용 목적: Google 로그인, 사용자 인증, 데이터 저장 및
            동기화, 서비스 운영 안정성 확보
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            Google Firebase는 서비스 제공에 필요한 범위 내에서만
            정보를 처리합니다.
          </Text>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          6. 사용자의 권리
        </Text>

        <View style={[styles.sectionCard, cardTheme]}>
          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 개인정보 조회
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 개인정보 수정
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 닉네임 변경
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 계정 삭제 요청
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            • 서비스 이용 해지
          </Text>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          7. 개인정보 보호
        </Text>

        <View style={[styles.sectionCard, cardTheme]}>
          <Text style={[styles.bodyText, { color: theme.subText }]}>
            루트 앱은 개인정보 보호를 위해 합리적인 보안 조치를
            적용하며, 사용자의 개인정보가 안전하게 관리될 수 있도록
            노력합니다.
          </Text>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          8. 개인정보 보호 책임자
        </Text>

        <View style={[styles.sectionCard, cardTheme]}>
          <Text style={[styles.bodyText, { color: theme.subText }]}>
            이메일: cwoos311@gmail.com
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            문의 시 영업일 기준 3일 이내 답변을 원칙으로 합니다.
          </Text>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          9. 개인정보처리방침 변경
        </Text>

        <View style={[styles.sectionCard, cardTheme]}>
          <Text style={[styles.bodyText, { color: theme.subText }]}>
            본 개인정보처리방침은 법령 또는 서비스 내용 변경에 따라
            수정될 수 있으며, 변경 시 앱 내 공지사항을 통해
            안내합니다.
          </Text>

          <Text style={[styles.bodyText, { color: theme.subText }]}>
            최초 시행일: 2026년 06월 18일
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
container: {
  flex: 1,
},

header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',

  paddingHorizontal: 18,

  paddingTop:
    Platform.OS === 'android'
      ? 26
      : 12,

  paddingBottom: 10,

  borderBottomWidth: 0,
},

backButton: {
  width: 34,
  height: 34,

  alignItems: 'center',
  justifyContent: 'center',

  borderWidth: 0.5,
},

headerTitle: {
  flex: 1,

  fontSize: 23,
  fontWeight: '900',
},

content: {
  paddingHorizontal: 18,
  paddingTop: 8,
  paddingBottom: 80,
},

noticeCard: {
  marginBottom: 18,

  paddingHorizontal: 14,
  paddingVertical: 13,

  borderWidth: 0.5,
},

noticeText: {
  fontSize: 13,
  lineHeight: 20,
  fontWeight: '700',
},

sectionTitle: {
  marginTop: 8,
  marginBottom: 8,

  fontSize: 17,
  fontWeight: '900',
  lineHeight: 23,
},

sectionCard: {
  marginBottom: 14,

  paddingHorizontal: 13,
  paddingTop: 12,
  paddingBottom: 7,

  borderWidth: 0.5,
},

bodyText: {
  marginBottom: 5,

  fontSize: 13,
  lineHeight: 21,
  fontWeight: '600',
},
});