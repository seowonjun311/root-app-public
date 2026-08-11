import {
  CHARACTER_AUTONOMOUS_DIALOGUE_POLICY,
  CHARACTER_MICRO_DIALOGUE_COOLDOWN_MS,
  getCharacterMicroDialogueTone,
  getCharacterRelationshipDialogueTier,
  type CharacterAutonomousDialogueContext,
  type CharacterMicroDialogueTone,
  type CharacterRelationshipDialogueTier,
} from './characterMicroDialogue';
import {
  type RootyConditionSnapshot,
} from './rootyCondition';

// CHARACTER_V99E_DETERMINISTIC_DIALOGUE_DIAGNOSTICS
export const CHARACTER_DIALOGUE_DIAGNOSTIC_SEED =
  99_005;

export const CHARACTER_DIALOGUE_DIAGNOSTIC_SAMPLES_PER_CONTEXT =
  10_000;

export const CHARACTER_DIALOGUE_RATE_TOLERANCE =
  0.015;

export const CHARACTER_DIALOGUE_RELEASE_TUNING = {
  interactionCooldownMs:
    CHARACTER_MICRO_DIALOGUE_COOLDOWN_MS,
  startupGraceMs:
    CHARACTER_AUTONOMOUS_DIALOGUE_POLICY
      .startupGraceMs,
  autonomousCooldownMs:
    CHARACTER_AUTONOMOUS_DIALOGUE_POLICY
      .cooldownMs,
  autonomousChance:
    CHARACTER_AUTONOMOUS_DIALOGUE_POLICY
      .chance,
  limits: {
    interactionCooldownMinMs:
      1_800,
    interactionCooldownMaxMs:
      3_000,
    startupGraceMinMs:
      20_000,
    startupGraceMaxMs:
      45_000,
    autonomousCooldownMinMs:
      60_000,
    autonomousCooldownMaxMs:
      120_000,
    maxAutonomousChance:
      0.12,
  },
} as const;

export type CharacterDialogueDiagnosticCheck = {
  id: string;
  label: string;
  expected: string;
  actual: string;
  pass: boolean;
};

export type CharacterDialogueRateDiagnostic = {
  context:
    CharacterAutonomousDialogueContext;
  expectedRate: number;
  observedRate: number;
  absoluteError: number;
  samples: number;
  hits: number;
  pass: boolean;
};

export type CharacterDialogueDiagnosticsSnapshot = {
  seed: number;
  samplesPerContext:
    number;
  relationshipChecks:
    CharacterDialogueDiagnosticCheck[];
  statePriorityChecks:
    CharacterDialogueDiagnosticCheck[];
  releaseTuningChecks:
    CharacterDialogueDiagnosticCheck[];
  autonomousRateChecks:
    CharacterDialogueRateDiagnostic[];
  totalChecks: number;
  passedChecks: number;
  releaseReady: boolean;
};

function createSeededRandom(
  seed: number
): () => number {
  let state =
    seed >>> 0;

  return () => {
    state =
      (
        state +
        0x6D2B79F5
      ) >>> 0;

    let value =
      state;

    value =
      Math.imul(
        value ^
          (
            value >>>
            15
          ),
        value |
          1
      );

    value ^=
      value +
      Math.imul(
        value ^
          (
            value >>>
            7
          ),
        value |
          61
      );

    return (
      (
        value ^
        (
          value >>>
          14
        )
      ) >>>
      0
    ) /
    4_294_967_296;
  };
}

function createDiagnosticCondition(
  input: {
    mood:
      'low' |
      'calm' |
      'happy' |
      'excited';
    energy:
      'exhausted' |
      'tired' |
      'normal' |
      'energetic';
    low?: boolean;
    tired?: boolean;
    exhausted?: boolean;
    excited?: boolean;
  }
): RootyConditionSnapshot {
  return ({
    mood:
      input.mood,
    energy:
      input.energy,
    affection:
      'close',
    reason:
      'tap',
    flags: {
      isLowMood:
        input.low ??
        false,
      isTired:
        input.tired ??
        false,
      isExhausted:
        input.exhausted ??
        false,
      isEnergetic:
        input.energy ===
        'energetic',
      isExcited:
        input.excited ??
        false,
      isBonded:
        false,
    },
  } as unknown) as RootyConditionSnapshot;
}

function stringCheck(
  id: string,
  label: string,
  expected: string,
  actual: string
): CharacterDialogueDiagnosticCheck {
  return {
    id,
    label,
    expected,
    actual,
    pass:
      expected ===
      actual,
  };
}

function booleanCheck(
  id: string,
  label: string,
  pass: boolean,
  actual: string
): CharacterDialogueDiagnosticCheck {
  return {
    id,
    label,
    expected:
      'PASS',
    actual,
    pass,
  };
}

function relationshipChecks():
  CharacterDialogueDiagnosticCheck[] {
  const cases:
    Array<[
      number,
      CharacterRelationshipDialogueTier,
    ]> = [
    [
      0,
      'distant',
    ],
    [
      24,
      'distant',
    ],
    [
      25,
      'familiar',
    ],
    [
      49,
      'familiar',
    ],
    [
      50,
      'close',
    ],
    [
      74,
      'close',
    ],
    [
      75,
      'bonded',
    ],
    [
      100,
      'bonded',
    ],
  ];

  return cases.map(
    (
      [
        points,
        expected,
      ]
    ) => {
      const actual =
        getCharacterRelationshipDialogueTier(
          points
        );

      return stringCheck(
        `relationship-${points}`,
        `친밀도 ${points}`,
        expected,
        actual
      );
    }
  );
}

function statePriorityChecks():
  CharacterDialogueDiagnosticCheck[] {
  const cases:
    Array<{
      id: string;
      label: string;
      condition:
        RootyConditionSnapshot;
      interaction:
        'tap' |
        'longPress';
      relationshipPoints:
        number;
      expected:
        CharacterMicroDialogueTone;
    }> = [
    {
      id:
        'state-tired-over-low',
      label:
        '피로 + 낮은 기분',
      condition:
        createDiagnosticCondition({
          mood:
            'low',
          energy:
            'tired',
          low: true,
          tired: true,
        }),
      interaction:
        'tap',
      relationshipPoints:
        80,
      expected:
        'tired',
    },
    {
      id:
        'state-exhausted',
      label:
        '탈진',
      condition:
        createDiagnosticCondition({
          mood:
            'happy',
          energy:
            'exhausted',
          tired: true,
          exhausted: true,
        }),
      interaction:
        'tap',
      relationshipPoints:
        80,
      expected:
        'tired',
    },
    {
      id:
        'state-low',
      label:
        '낮은 기분',
      condition:
        createDiagnosticCondition({
          mood:
            'low',
          energy:
            'normal',
          low: true,
        }),
      interaction:
        'tap',
      relationshipPoints:
        80,
      expected:
        'low',
    },
    {
      id:
        'state-excited',
      label:
        '들뜬 상태',
      condition:
        createDiagnosticCondition({
          mood:
            'excited',
          energy:
            'energetic',
          excited: true,
        }),
      interaction:
        'longPress',
      relationshipPoints:
        100,
      expected:
        'excited',
    },
    {
      id:
        'state-bonded-long',
      label:
        'bonded 길게 누르기',
      condition:
        createDiagnosticCondition({
          mood:
            'happy',
          energy:
            'normal',
        }),
      interaction:
        'longPress',
      relationshipPoints:
        75,
      expected:
        'bonded',
    },
    {
      id:
        'state-happy-tap',
      label:
        'happy 짧은 탭',
      condition:
        createDiagnosticCondition({
          mood:
            'happy',
          energy:
            'normal',
        }),
      interaction:
        'tap',
      relationshipPoints:
        75,
      expected:
        'happy',
    },
    {
      id:
        'state-calm',
      label:
        '기본 calm',
      condition:
        createDiagnosticCondition({
          mood:
            'calm',
          energy:
            'normal',
        }),
      interaction:
        'tap',
      relationshipPoints:
        20,
      expected:
        'calm',
    },
  ];

  return cases.map(
    (
      item
    ) => {
      const actual =
        getCharacterMicroDialogueTone({
          condition:
            item.condition,
          interaction:
            item.interaction,
          relationshipPoints:
            item.relationshipPoints,
        });

      return stringCheck(
        item.id,
        item.label,
        item.expected,
        actual
      );
    }
  );
}

function releaseTuningChecks():
  CharacterDialogueDiagnosticCheck[] {
  const tuning =
    CHARACTER_DIALOGUE_RELEASE_TUNING;

  const chanceValues =
    Object.values(
      tuning.autonomousChance
    );

  const maxChance =
    Math.max(
      ...chanceValues
    );

  return [
    booleanCheck(
      'tuning-interaction-cooldown',
      '사용자 대사 cooldown',
      tuning.interactionCooldownMs >=
        tuning.limits
          .interactionCooldownMinMs &&
        tuning.interactionCooldownMs <=
          tuning.limits
            .interactionCooldownMaxMs,
      `${tuning.interactionCooldownMs}ms`
    ),
    booleanCheck(
      'tuning-startup-grace',
      '자율대사 startup grace',
      tuning.startupGraceMs >=
        tuning.limits
          .startupGraceMinMs &&
        tuning.startupGraceMs <=
          tuning.limits
            .startupGraceMaxMs,
      `${tuning.startupGraceMs}ms`
    ),
    booleanCheck(
      'tuning-autonomous-cooldown',
      '자율대사 cooldown',
      tuning.autonomousCooldownMs >=
        tuning.limits
          .autonomousCooldownMinMs &&
        tuning.autonomousCooldownMs <=
          tuning.limits
            .autonomousCooldownMaxMs,
      `${tuning.autonomousCooldownMs}ms`
    ),
    booleanCheck(
      'tuning-max-context-chance',
      '최대 context 확률',
      maxChance <=
        tuning.limits
          .maxAutonomousChance &&
        chanceValues.every(
          (
            value
          ) =>
            value >
            0
        ),
      `${(
        maxChance *
        100
      ).toFixed(
        1
      )}%`
    ),
  ];
}

function autonomousRateChecks(
  seed: number,
  samplesPerContext:
    number
): CharacterDialogueRateDiagnostic[] {
  const random =
    createSeededRandom(
      seed
    );

  const contexts:
    CharacterAutonomousDialogueContext[] = [
    'idle',
    'lookAround',
    'sit',
    'sleep',
  ];

  return contexts.map(
    (
      context
    ) => {
      const expectedRate =
        CHARACTER_AUTONOMOUS_DIALOGUE_POLICY
          .chance[
            context
          ];

      let hits =
        0;

      for (
        let i = 0;
        i <
        samplesPerContext;
        i += 1
      ) {
        if (
          random() <
          expectedRate
        ) {
          hits +=
            1;
        }
      }

      const observedRate =
        hits /
        samplesPerContext;

      const absoluteError =
        Math.abs(
          observedRate -
          expectedRate
        );

      return {
        context,
        expectedRate,
        observedRate,
        absoluteError,
        samples:
          samplesPerContext,
        hits,
        pass:
          absoluteError <=
          CHARACTER_DIALOGUE_RATE_TOLERANCE,
      };
    }
  );
}

// CHARACTER_V99E_RELEASE_TUNING_GATES
export function runCharacterDialogueDeterministicDiagnostics(
  input?: {
    seed?: number;
    samplesPerContext?:
      number;
  }
): CharacterDialogueDiagnosticsSnapshot {
  const seed =
    input?.seed ??
    CHARACTER_DIALOGUE_DIAGNOSTIC_SEED;

  const samplesPerContext =
    Math.max(
      1_000,
      Math.floor(
        input
          ?.samplesPerContext ??
        CHARACTER_DIALOGUE_DIAGNOSTIC_SAMPLES_PER_CONTEXT
      )
    );

  const relation =
    relationshipChecks();

  const state =
    statePriorityChecks();

  const tuning =
    releaseTuningChecks();

  const rates =
    autonomousRateChecks(
      seed,
      samplesPerContext
    );

  const totalChecks =
    relation.length +
    state.length +
    tuning.length +
    rates.length;

  const passedChecks =
    relation.filter(
      (
        item
      ) =>
        item.pass
    ).length +
    state.filter(
      (
        item
      ) =>
        item.pass
    ).length +
    tuning.filter(
      (
        item
      ) =>
        item.pass
    ).length +
    rates.filter(
      (
        item
      ) =>
        item.pass
    ).length;

  return {
    seed,
    samplesPerContext,
    relationshipChecks:
      relation,
    statePriorityChecks:
      state,
    releaseTuningChecks:
      tuning,
    autonomousRateChecks:
      rates,
    totalChecks,
    passedChecks,
    releaseReady:
      passedChecks ===
      totalChecks,
  };
}
