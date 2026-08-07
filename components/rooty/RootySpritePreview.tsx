import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import RootySprite from './RootySprite';
import type { RootyAction } from '../../constants/rootyAssets';

const ACTIONS: RootyAction[] = [
  'idle',
  'walk',
  'sit',
  'sleep',
  'happy',
];

export default function RootySpritePreview() {
  const [action, setAction] = useState<RootyAction>('idle');
  const [autoPlay, setAutoPlay] = useState(true);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!autoPlay) {
      return;
    }

    const timer = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % ACTIONS.length;
      setAction(ACTIONS[indexRef.current]);
    }, 3000);

    return () => clearInterval(timer);
  }, [autoPlay]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.stage}>
        <RootySprite
          action={action}
          size={190}
          onPress={() => setAction('happy')}
          onAnimationEnd={(finishedAction) => {
            if (finishedAction === 'happy') {
              setAction('idle');
            }
          }}
        />
      </View>

      <Text style={styles.label}>현재 동작: {action}</Text>

      <View style={styles.buttons}>
        {ACTIONS.map((item) => (
          <Pressable
            key={item}
            onPress={() => {
              setAutoPlay(false);
              setAction(item);
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => setAutoPlay((prev) => !prev)}
        style={styles.autoButton}
      >
        <Text style={styles.buttonText}>
          자동 전환 {autoPlay ? 'ON' : 'OFF'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 20,
  },
  stage: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 12,
    fontSize: 15,
  },
  buttons: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  button: {
    borderWidth: 1,
    borderColor: '#A98D74',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  autoButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A98D74',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  buttonText: {
    fontSize: 13,
  },
});
