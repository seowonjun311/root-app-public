import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

export type RootThemeMode =
  | 'warm'
  | 'cityBlack';

export type RootThemeRadius = {
  card: number;
  box: number;
  button: number;
  image: number;
  modal: number;
};

export type RootTheme = {
  mode: RootThemeMode;

  background: string;
  card: string;
  card2: string;
  card3: string;

  text: string;
  subText: string;
  mutedText: string;

  line: string;
  strongLine: string;

  button: string;
  buttonText: string;

  danger: string;
  dangerText: string;

  shadow: string;

  radius: RootThemeRadius;
};

export const ROOT_THEME_MODE_KEY =
  'root_theme_mode_v1';

export const rootThemes: Record<
  RootThemeMode,
  RootTheme
> = {
  warm: {
    mode: 'warm',

    background: '#f5e9cf',
    card: '#fff8ec',
    card2: '#f1dfbd',
    card3: '#ead7b3',

    text: '#5f3b1b',
    subText: '#8b6a45',
    mutedText: '#b08a5a',

    line: '#d8b56c',
    strongLine: '#9c651f',

    button: '#9c651f',
    buttonText: '#fffaf0',

    danger: '#b91c1c',
    dangerText: '#fffaf0',

    shadow:
      'rgba(80, 45, 15, 0.18)',

    radius: {
      card: 24,
      box: 18,
      button: 999,
      image: 18,
      modal: 26,
    },
  },

  cityBlack: {
    mode: 'cityBlack',

    background: '#050505',
    card: '#101010',
    card2: '#171717',
    card3: '#222222',

    text: '#f5f5f5',
    subText: '#b7b7b7',
    mutedText: '#7c7c7c',

    line: '#343434',
    strongLine: '#f5f5f5',

    button: '#f5f5f5',
    buttonText: '#050505',

    danger: '#ef4444',
    dangerText: '#ffffff',

    shadow: 'rgba(0, 0, 0, 0)',

    radius: {
      card: 4,
      box: 4,
      button: 4,
      image: 2,
      modal: 4,
    },
  },
};

let rootThemeMode: RootThemeMode =
  'warm';

let themeLoadPromise:
  | Promise<RootThemeMode>
  | null = null;

const listeners = new Set<
  (mode: RootThemeMode) => void
>();

function isRootThemeMode(
  value: unknown
): value is RootThemeMode {
  return (
    value === 'warm' ||
    value === 'cityBlack'
  );
}

function notifyThemeListeners(
  mode: RootThemeMode
) {
  listeners.forEach((listener) => {
    try {
      listener(mode);
    } catch (error) {
      console.log(
        'ROOT THEME LISTENER ERROR',
        error
      );
    }
  });
}

export async function loadRootThemeMode(): Promise<RootThemeMode> {
  if (themeLoadPromise) {
    return themeLoadPromise;
  }

  themeLoadPromise = (async () => {
    try {
      const saved =
        await AsyncStorage.getItem(
          ROOT_THEME_MODE_KEY
        );

      if (isRootThemeMode(saved)) {
        rootThemeMode = saved;
      }

      return rootThemeMode;
    } catch (error) {
      console.log(
        'ROOT THEME LOAD ERROR',
        error
      );

      return rootThemeMode;
    } finally {
      themeLoadPromise = null;
    }
  })();

  return themeLoadPromise;
}

export function getRootThemeMode(): RootThemeMode {
  return rootThemeMode;
}

export function getRootTheme(): RootTheme {
  return rootThemes[rootThemeMode];
}

export async function setRootThemeMode(
  mode: RootThemeMode
): Promise<RootThemeMode> {
  if (!isRootThemeMode(mode)) {
    return rootThemeMode;
  }

  rootThemeMode = mode;

  notifyThemeListeners(mode);

  try {
    await AsyncStorage.setItem(
      ROOT_THEME_MODE_KEY,
      mode
    );
  } catch (error) {
    console.log(
      'ROOT THEME SAVE ERROR',
      error
    );
  }

  return mode;
}

export function subscribeRootTheme(
  listener: (
    mode: RootThemeMode
  ) => void
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useRootTheme() {
  const [
    themeMode,
    setThemeModeState,
  ] = useState<RootThemeMode>(
    rootThemeMode
  );

  useEffect(() => {
    let mounted = true;

    const unsubscribe =
      subscribeRootTheme((mode) => {
        if (mounted) {
          setThemeModeState(mode);
        }
      });

    loadRootThemeMode().then((mode) => {
      if (mounted) {
        setThemeModeState(mode);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const changeThemeMode =
    useCallback(
      async (
        mode: RootThemeMode
      ) => {
        await setRootThemeMode(mode);
      },
      []
    );

  return {
    themeMode,
    theme:
      rootThemes[themeMode],
    setThemeMode:
      changeThemeMode,
    isCityBlack:
      themeMode === 'cityBlack',
  };
}