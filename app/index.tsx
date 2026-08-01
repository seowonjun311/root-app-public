import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRootTheme } from '../store/rootTheme';

export default function IndexScreen() {
  const { themeMode, theme } =
    useRootTheme();

  const isCityBlack =
    themeMode === 'cityBlack';

  const routedRef = useRef(false);

  useEffect(() => {
    if (routedRef.current) {
      return;
    }

    routedRef.current = true;

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.loadingCard,
          {
            backgroundColor:
              theme.card,
            borderColor: theme.line,
            borderRadius:
              isCityBlack ? 4 : 28,
          },
        ]}
      >
        <Text style={styles.logo}>
          🦊
        </Text>

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
          나만의 성장 여정을 준비하고 있어요.
        </Text>

        <ActivityIndicator
          size="large"
          color={theme.button}
          style={styles.indicator}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 36,
    borderWidth: 1,
  },

  logo: {
    fontSize: 64,
  },

  title: {
    marginTop: 14,
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },

  description: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },

  indicator: {
    marginTop: 24,
  },
});