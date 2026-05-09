import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';

type LoadingBarProps = {
  message?: string;
};

export function LoadingBar({ message = 'Loading data from server...' }: LoadingBarProps) {
  const [dots, setDots] = useState('');

  const skaterX = useRef(new Animated.Value(-95)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const lean = useRef(new Animated.Value(0)).current;
  const pushLeg = useRef(new Animated.Value(0)).current;
  const frontArm = useRef(new Animated.Value(0)).current;
  const backArm = useRef(new Animated.Value(0)).current;
  const wheelSpin = useRef(new Animated.Value(0)).current;
  const eyeBlink = useRef(new Animated.Value(1)).current;
  const mouthMood = useRef(new Animated.Value(0)).current;
  const noteOne = useRef(new Animated.Value(0)).current;
  const noteTwo = useRef(new Animated.Value(0)).current;
  const dustOne = useRef(new Animated.Value(0)).current;
  const dustTwo = useRef(new Animated.Value(0)).current;
  const dustThree = useRef(new Animated.Value(0)).current;
  const bgMove = useRef(new Animated.Value(0)).current;

  const bounceY = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const leanDeg = lean.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['10deg', '0deg', '-9deg'],
  });

  const pushLegRotate = pushLeg.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: ['-8deg', '16deg', '-6deg'],
  });

  const pushLegX = pushLeg.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, -7, 4],
  });

  const frontArmRotate = frontArm.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['24deg', '0deg', '-22deg'],
  });

  const backArmRotate = backArm.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-24deg', '0deg', '22deg'],
  });

  const wheelRotate = wheelSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const mouthWidth = mouthMood.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 13],
  });

  const mouthHeight = mouthMood.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 5],
  });

  const mouthCurve = mouthMood.interpolate({
    inputRange: [0, 1],
    outputRange: [1.7, 2.2],
  });

  const noteOneY = noteOne.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -11],
  });

  const noteTwoY = noteTwo.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -9],
  });

  const bgShift = bgMove.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });

  useEffect(() => {
    const pushPhase = Animated.parallel([
      Animated.timing(skaterX, {
        toValue: -30,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pushLeg, {
        toValue: 1,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lean, {
        toValue: 1,
        duration: 260,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bounce, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(frontArm, {
        toValue: 1,
        duration: 260,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(backArm, {
        toValue: 1,
        duration: 260,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const glidePhase = Animated.parallel([
      Animated.timing(skaterX, {
        toValue: 85,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pushLeg, {
        toValue: 0.08,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(lean, {
        toValue: 0,
        duration: 760,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bounce, {
        toValue: 0,
        duration: 560,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(frontArm, {
        toValue: 0.14,
        duration: 760,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(backArm, {
        toValue: 0.14,
        duration: 760,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const reversePush = Animated.parallel([
      Animated.timing(skaterX, {
        toValue: 25,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pushLeg, {
        toValue: -1,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lean, {
        toValue: -1,
        duration: 260,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bounce, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(frontArm, {
        toValue: -1,
        duration: 260,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(backArm, {
        toValue: -1,
        duration: 260,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const reverseGlide = Animated.parallel([
      Animated.timing(skaterX, {
        toValue: -95,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pushLeg, {
        toValue: -0.08,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(lean, {
        toValue: 0,
        duration: 760,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bounce, {
        toValue: 0,
        duration: 560,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(frontArm, {
        toValue: -0.14,
        duration: 760,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(backArm, {
        toValue: -0.14,
        duration: 760,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const skatingLoop = Animated.loop(
      Animated.sequence([pushPhase, glidePhase, Animated.delay(120), reversePush, reverseGlide, Animated.delay(120)])
    );

    const wheelLoop = Animated.loop(
      Animated.timing(wheelSpin, {
        toValue: 1,
        duration: 380,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(eyeBlink, {
          toValue: 0.2,
          duration: 90,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(eyeBlink, {
          toValue: 1,
          duration: 120,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const mouthLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mouthMood, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(mouthMood, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    const notesLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(noteOne, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(noteOne, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(420),
          Animated.timing(noteTwo, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(noteTwo, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );

    const dustLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(dustOne, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(dustOne, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(220),
          Animated.timing(dustTwo, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(dustTwo, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(440),
          Animated.timing(dustThree, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(dustThree, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );

    const bgLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bgMove, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgMove, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : `${prev}.`));
    }, 500);

    skatingLoop.start();
    wheelLoop.start();
    blinkLoop.start();
    mouthLoop.start();
    notesLoop.start();
    dustLoop.start();
    bgLoop.start();

    return () => {
      clearInterval(dotTimer);
      skatingLoop.stop();
      wheelLoop.stop();
      blinkLoop.stop();
      mouthLoop.stop();
      notesLoop.stop();
      dustLoop.stop();
      bgLoop.stop();
    };
  }, [backArm, bgMove, dustOne, dustThree, dustTwo, eyeBlink, frontArm, lean, mouthMood, noteOne, noteTwo, pushLeg, skaterX, wheelSpin]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bgGlowLeft, { transform: [{ translateX: bgShift }] }]} />
      <Animated.View style={[styles.bgGlowRight, { transform: [{ translateX: bgShift }, { scale: 1.05 }] }]} />

      <View style={styles.sceneWrap}>
        <Animated.View style={[styles.dust, styles.dust1, { opacity: dustOne }]} />
        <Animated.View style={[styles.dust, styles.dust2, { opacity: dustTwo }]} />
        <Animated.View style={[styles.dust, styles.dust3, { opacity: dustThree }]} />
        <View style={styles.track} />

        <Animated.View style={[styles.skaterGroup, { transform: [{ translateX: skaterX }, { translateY: bounceY }, { rotate: leanDeg }] }]}>
          <View style={styles.head}>
            <View style={styles.hairCap} />
            <View style={styles.hairTail} />
            <View style={styles.browLeft} />
            <View style={styles.browRight} />
            <View style={styles.eyeRow}>
              <Animated.View style={[styles.eyeWrap, { transform: [{ scaleY: eyeBlink }] }]}>
                <View style={styles.eye} />
                <View style={styles.eyeShine} />
              </Animated.View>
              <Animated.View style={[styles.eyeWrap, { transform: [{ scaleY: eyeBlink }] }]}>
                <View style={styles.eye} />
                <View style={styles.eyeShine} />
              </Animated.View>
            </View>
            <Animated.View style={[styles.mouth, { width: mouthWidth, height: mouthHeight, borderBottomWidth: mouthCurve }]} />
            <View style={styles.blushLeft} />
            <View style={styles.blushRight} />
          </View>

          <View style={styles.torso}>
            <View style={styles.torsoStripe} />
          </View>
          <View style={styles.shorts} />
          <Animated.View style={[styles.armBack, { transform: [{ rotate: backArmRotate }] }]} />
          <Animated.View style={[styles.armFront, { transform: [{ rotate: frontArmRotate }] }]} />
          <View style={styles.standingLeg} />
          <View style={styles.standingFoot} />
          <Animated.View style={[styles.pushLeg, { transform: [{ rotate: pushLegRotate }, { translateX: pushLegX }] }]}>
            <View style={styles.pushFoot} />
          </Animated.View>

          <View style={styles.board}>
            <View style={styles.boardStripe} />
          </View>
          <Animated.View style={[styles.wheel, styles.wheelLeft, { transform: [{ rotate: wheelRotate }] }]}>
            <View style={styles.wheelHub} />
          </Animated.View>
          <Animated.View style={[styles.wheel, styles.wheelRight, { transform: [{ rotate: wheelRotate }] }]}>
            <View style={styles.wheelHub} />
          </Animated.View>

          <Animated.Text style={[styles.note, styles.note1, { transform: [{ translateY: noteOneY }] }]}>♪</Animated.Text>
          <Animated.Text style={[styles.note, styles.note2, { transform: [{ translateY: noteTwoY }] }]}>♫</Animated.Text>
        </Animated.View>
      </View>

      <Text style={styles.message}>{message}</Text>
      <Text style={styles.readyText}>
        Getting things ready<Text style={styles.dotSlot}>{dots}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  bgGlowLeft: {
    position: 'absolute',
    top: -20,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#C4B5FD33',
  },
  bgGlowRight: {
    position: 'absolute',
    bottom: 40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#93C5FD26',
  },
  sceneWrap: {
    width: 340,
    maxWidth: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dust: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },
  dust1: {
    width: 9,
    height: 3,
    left: 78,
    top: 165,
    transform: [{ rotate: '2deg' }],
  },
  dust2: {
    width: 6,
    height: 2,
    left: 62,
    top: 171,
    transform: [{ rotate: '-3deg' }],
  },
  dust3: {
    width: 7,
    height: 3,
    left: 70,
    top: 177,
    transform: [{ rotate: '5deg' }],
  },
  track: {
    position: 'absolute',
    width: 260,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.light.border,
    top: 142,
  },
  skaterGroup: {
    width: 100,
    height: 122,
    position: 'absolute',
    top: 40,
    left: '50%',
    marginLeft: -50,
  },
  head: {
    position: 'absolute',
    left: 27,
    top: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0C29A',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  hairCap: {
    position: 'absolute',
    top: -2,
    width: 38,
    height: 17,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#7A4A2B',
  },
  hairTail: {
    position: 'absolute',
    left: -5,
    top: 9,
    width: 10,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7A4A2B',
  },
  browLeft: {
    position: 'absolute',
    left: 7,
    top: 12,
    width: 9,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#2B1A10',
  },
  browRight: {
    position: 'absolute',
    right: 7,
    top: 12,
    width: 9,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#2B1A10',
  },
  eyeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 17,
    marginTop: 16,
  },
  eyeWrap: {
    width: 4,
    height: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eye: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#111827',
  },
  eyeShine: {
    position: 'absolute',
    width: 1,
    height: 1,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
    top: 0,
    right: 0,
  },
  mouth: {
    width: 11,
    height: 4,
    borderBottomWidth: 1.7,
    borderBottomColor: '#111827',
    borderRadius: 5,
    marginTop: 3,
  },
  blushLeft: {
    position: 'absolute',
    left: 2,
    top: 17,
    width: 5,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#E99AA8',
    opacity: 0.55,
  },
  blushRight: {
    position: 'absolute',
    right: 2,
    top: 17,
    width: 5,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#E99AA8',
    opacity: 0.55,
  },
  torso: {
    position: 'absolute',
    left: 28,
    top: 36,
    width: 30,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#5EA0DA',
    alignItems: 'center',
    paddingTop: 8,
  },
  torsoStripe: {
    width: 18,
    height: 5,
    borderRadius: 4,
    backgroundColor: '#8AC0EC',
  },
  shorts: {
    position: 'absolute',
    left: 31,
    top: 69,
    width: 24,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#2D6CDF',
  },
  armFront: {
    position: 'absolute',
    left: 58,
    top: 39,
    width: 8,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#F0C29A',
  },
  armBack: {
    position: 'absolute',
    left: 21,
    top: 39,
    width: 8,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#F0C29A',
  },
  standingLeg: {
    position: 'absolute',
    left: 44,
    top: 70,
    width: 9,
    height: 26,
    borderRadius: 5,
    backgroundColor: '#F0C29A',
  },
  standingFoot: {
    position: 'absolute',
    left: 35,
    top: 93,
    width: 26,
    height: 8,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  pushLeg: {
    position: 'absolute',
    left: 27,
    top: 69,
    width: 9,
    height: 28,
    borderRadius: 5,
    backgroundColor: '#F0C29A',
  },
  pushFoot: {
    position: 'absolute',
    left: -4,
    top: 23,
    width: 24,
    height: 8,
    borderRadius: 10,
    backgroundColor: '#D96C6C',
  },
  board: {
    position: 'absolute',
    left: 12,
    top: 104,
    width: 64,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#E6A240',
    justifyContent: 'center',
  },
  boardStripe: {
    marginHorizontal: 10,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#F0C173',
  },
  wheel: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4B5563',
    top: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelLeft: {
    left: 24,
  },
  wheelRight: {
    left: 64,
  },
  wheelHub: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  note: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '700',
  },
  note1: {
    left: 240,
    top: 40,
    color: '#22D3EE',
  },
  note2: {
    left: 214,
    top: 32,
    color: '#A855F7',
  },
  message: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  readyText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.mutedForeground,
    textAlign: 'center',
  },
  dotSlot: {
    minWidth: 22,
  },
});
