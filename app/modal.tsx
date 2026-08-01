import { router } from 'expo-router';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRootTheme } from '../store/rootTheme';

export default function ModalScreen() {
  const { themeMode, theme } =
    useRootTheme();

  const isCityBlack =
    themeMode === 'cityBlack';

  const closeModal = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)');
  };

  const goHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <Pressable
        style={styles.overlay}
        onPress={closeModal}
      >
        <Pressable
          style={[
            styles.modalCard,
            {
              backgroundColor:
                theme.card,
              borderColor: theme.line,
              borderRadius:
                isCityBlack ? 4 : 28,
            },
          ]}
          onPress={(event) =>
            event.stopPropagation()
          }
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor:
                  theme.card2,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack ? 4 : 24,
              },
            ]}
          >
            <Text style={styles.icon}>
              🦊
            </Text>
          </View>

          <Text
            style={[
              styles.title,
              { color: theme.text },
            ]}
          >
            루트
          </Text>

          <Text
            style={[
              styles.description,
              { color: theme.subText },
            ]}
          >
            선택한 작업을 계속 진행하거나 홈으로 이동할 수 있어요.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={closeModal}
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                {
                  backgroundColor:
                    theme.card2,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 4
                      : 18,
                  opacity: pressed
                    ? 0.7
                    : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: theme.text },
                ]}
              >
                닫기
              </Text>
            </Pressable>

            <Pressable
              onPress={goHome}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                {
                  backgroundColor:
                    theme.button,
                  borderColor:
                    theme.strongLine,
                  borderRadius:
                    isCityBlack
                      ? 4
                      : 18,
                  opacity: pressed
                    ? 0.75
                    : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  {
                    color:
                      theme.buttonText,
                  },
                ]}
              >
                홈으로
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.58)',
  },

  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  modalCard: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
  },

  iconBox: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  icon: {
    fontSize: 46,
  },

  title: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },

  description: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },

  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 26,
  },

  button: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  secondaryButton: {},

  primaryButton: {},

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '900',
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: '900',
  },
});