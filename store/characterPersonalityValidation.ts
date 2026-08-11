import {
  type CharacterId,
} from '../constants/characterAssets';
import {
  getCharacterPersonalityProfile,
} from '../constants/characterPersonality';
import {
  type CharacterRestWeights,
  type CharacterSocialChanceChannel,
} from './characterPersonalityPolicy';
import {
  type CharacterRuntimeStatistics,
} from './characterRuntimeStatistics';

export type CharacterPersonalityValidationStatus =
  'PASS' |
  'CHECK' |
  'WAIT';

export type CharacterPersonalityValidationConfidence =
  'warming' |
  'usable' |
  'strong';

export type CharacterPersonalityValidationCheck = {
  id: string;
  label: string;
  status:
    CharacterPersonalityValidationStatus;
  summary: string;
};

export type CharacterPersonalityValidationReport = {
  characterId: CharacterId;
  overallStatus:
    CharacterPersonalityValidationStatus;
  confidence:
    CharacterPersonalityValidationConfidence;
  restSampleCount: number;
  socialSampleCount: number;
  personalityDelta:
    CharacterRestWeights | null;
  selectorMaxError:
    number | null;
  selectorTolerance:
    number | null;
  checks:
    CharacterPersonalityValidationCheck[];
};

const REST_SIGNATURE_MIN_SAMPLES =
  5;

const REST_EXECUTION_MIN_SAMPLES =
  20;

const REST_STRONG_SAMPLES =
  50;

const SOCIAL_MIN_SAMPLES =
  3;

const SOCIAL_TOLERANCE =
  0.005;

const DELTA_TOLERANCE =
  0.005;

const SOCIAL_BASE_CHANCE:
  Record<
    CharacterSocialChanceChannel,
    number
  > = {
  spontaneousHappy:
    0.22,
  passiveAttention:
    0.12,
  bondedFollowUpTouch:
    0.35,
};

const REST_KEYS:
  readonly (
    keyof CharacterRestWeights
  )[] = [
  'lookAround',
  'sitRest',
  'nap',
];

function clamp01(
  value: number
): number {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(
      0,
      value
    )
  );
}

function average(
  values: number[]
): number | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  return (
    values.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    ) /
    values.length
  );
}

function averageRest(
  values:
    CharacterRestWeights[]
): CharacterRestWeights | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  const total =
    values.reduce(
      (
        current,
        value
      ) => ({
        lookAround:
          current.lookAround +
          value.lookAround,
        sitRest:
          current.sitRest +
          value.sitRest,
        nap:
          current.nap +
          value.nap,
      }),
      {
        lookAround: 0,
        sitRest: 0,
        nap: 0,
      }
    );

  return {
    lookAround:
      total.lookAround /
      values.length,
    sitRest:
      total.sitRest /
      values.length,
    nap:
      total.nap /
      values.length,
  };
}

function subtractRest(
  first:
    CharacterRestWeights,
  second:
    CharacterRestWeights
): CharacterRestWeights {
  return {
    lookAround:
      first.lookAround -
      second.lookAround,
    sitRest:
      first.sitRest -
      second.sitRest,
    nap:
      first.nap -
      second.nap,
  };
}

function reconstructPrePersonalityRest(
  characterId: CharacterId,
  post:
    CharacterRestWeights
): CharacterRestWeights | null {
  const multipliers =
    getCharacterPersonalityProfile(
      characterId
    ).restMultipliers;

  const raw = {
    lookAround:
      multipliers.lookAround > 0
        ? post.lookAround /
          multipliers.lookAround
        : 0,
    sitRest:
      multipliers.sitRest > 0
        ? post.sitRest /
          multipliers.sitRest
        : 0,
    nap:
      multipliers.nap > 0
        ? post.nap /
          multipliers.nap
        : 0,
  };

  const total =
    raw.lookAround +
    raw.sitRest +
    raw.nap;

  if (
    !Number.isFinite(
      total
    ) ||
    total <= 0
  ) {
    return null;
  }

  return {
    lookAround:
      raw.lookAround /
      total,
    sitRest:
      raw.sitRest /
      total,
    nap:
      raw.nap /
      total,
  };
}

function createSignatureCheck(
  characterId: CharacterId,
  statistics:
    CharacterRuntimeStatistics
): {
  check:
    CharacterPersonalityValidationCheck;
  delta:
    CharacterRestWeights | null;
} {
  const pairs =
    statistics.restSamples
      .map(
        (sample) => {
          if (
            sample.personalityRest ===
              null
          ) {
            return null;
          }

          const before =
            reconstructPrePersonalityRest(
              characterId,
              sample.personalityRest
            );

          if (
            before ===
              null
          ) {
            return null;
          }

          return {
            before,
            after:
              sample.personalityRest,
          };
        }
      )
      .filter(
        (
          value
        ): value is {
          before:
            CharacterRestWeights;
          after:
            CharacterRestWeights;
        } =>
          value !== null
      );

  if (
    pairs.length <
    REST_SIGNATURE_MIN_SAMPLES
  ) {
    return {
      delta:
        null,
      check: {
        id:
          'personality-signature',
        label:
          'Personality rest signature',
        status:
          'WAIT',
        summary:
          'Need at least ' +
          REST_SIGNATURE_MIN_SAMPLES +
          ' personality-rest samples; current ' +
          pairs.length +
          '.',
      },
    };
  }

  const beforeAverage =
    averageRest(
      pairs.map(
        (pair) =>
          pair.before
      )
    );

  const afterAverage =
    averageRest(
      pairs.map(
        (pair) =>
          pair.after
      )
    );

  if (
    beforeAverage === null ||
    afterAverage === null
  ) {
    return {
      delta:
        null,
      check: {
        id:
          'personality-signature',
        label:
          'Personality rest signature',
        status:
          'WAIT',
        summary:
          'Personality rest averages are not available yet.',
      },
    };
  }

  const delta =
    subtractRest(
      afterAverage,
      beforeAverage
    );

  let pass =
    false;

  let intent =
    '';

  if (
    characterId ===
    'rooty'
  ) {
    const maximum =
      Math.max(
        Math.abs(
          delta.lookAround
        ),
        Math.abs(
          delta.sitRest
        ),
        Math.abs(
          delta.nap
        )
      );

    pass =
      maximum <=
      0.001;

    intent =
      'balanced delta near 0';
  }
  else if (
    characterId ===
      'moru' ||
    characterId ===
      'pio' ||
    characterId ===
      'nuri'
  ) {
    // CHARACTER_V90B_PIO_PERSONALITY_VALIDATION
    // CHARACTER_V91B_NURI_PERSONALITY_VALIDATION
    pass =
      delta.lookAround >
        DELTA_TOLERANCE &&
      delta.nap <
        -DELTA_TOLERANCE;

    intent =
      'look up / nap down';
  }
  else if (
    characterId ===
    'mongsil'
  ) {
    pass =
      delta.lookAround <
        -DELTA_TOLERANCE &&
      delta.nap >
        DELTA_TOLERANCE &&
      (
        delta.sitRest +
        delta.nap
      ) >
        DELTA_TOLERANCE;

    intent =
      'look down / restful share up';
  }
  else {
    pass =
      delta.nap <
        -DELTA_TOLERANCE &&
      (
        delta.lookAround +
        delta.sitRest
      ) >
        DELTA_TOLERANCE;

    intent =
      'nap down / awake-rest share up';
  }

  return {
    delta,
    check: {
      id:
        'personality-signature',
      label:
        'Personality rest signature',
      status:
        pass
          ? 'PASS'
          : 'CHECK',
      summary:
        intent +
        '; delta look=' +
        (
          delta.lookAround *
          100
        ).toFixed(
          1
        ) +
        'pp, sit=' +
        (
          delta.sitRest *
          100
        ).toFixed(
          1
        ) +
        'pp, nap=' +
        (
          delta.nap *
          100
        ).toFixed(
          1
        ) +
        'pp.',
    },
  };
}

function isRestBehavior(
  value: string
): value is
  keyof CharacterRestWeights {
  return (
    value ===
      'lookAround' ||
    value ===
      'sitRest' ||
    value ===
      'nap'
  );
}

function createExecutionCheck(
  statistics:
    CharacterRuntimeStatistics
): {
  check:
    CharacterPersonalityValidationCheck;
  maxError:
    number | null;
  tolerance:
    number | null;
} {
  const recognized =
    statistics.restSamples.filter(
      (sample) =>
        isRestBehavior(
          sample.behavior
        )
    );

  if (
    recognized.length <
    REST_EXECUTION_MIN_SAMPLES
  ) {
    return {
      maxError:
        null,
      tolerance:
        null,
      check: {
        id:
          'rest-execution',
        label:
          'Actual rest selection vs final probabilities',
        status:
          'WAIT',
        summary:
          'Need at least ' +
          REST_EXECUTION_MIN_SAMPLES +
          ' actual rest decisions; current ' +
          recognized.length +
          '.',
      },
    };
  }

  const finalAverage =
    averageRest(
      recognized.map(
        (sample) =>
          sample.finalRest
      )
    );

  if (
    finalAverage ===
    null
  ) {
    return {
      maxError:
        null,
      tolerance:
        null,
      check: {
        id:
          'rest-execution',
        label:
          'Actual rest selection vs final probabilities',
        status:
          'WAIT',
        summary:
          'Final rest probability samples are not available.',
      },
    };
  }

  const counts:
    CharacterRestWeights = {
    lookAround: 0,
    sitRest: 0,
    nap: 0,
  };

  recognized.forEach(
    (sample) => {
      const behavior =
        sample.behavior;

      if (
        !isRestBehavior(
          behavior
        )
      ) {
        return;
      }

      counts[
        behavior
      ] +=
        1;
    }
  );

  const frequency: CharacterRestWeights = {
    lookAround:
      counts.lookAround /
      recognized.length,
    sitRest:
      counts.sitRest /
      recognized.length,
    nap:
      counts.nap /
      recognized.length,
  };

  const errors =
    REST_KEYS.map(
      (key) =>
        Math.abs(
          frequency[
            key
          ] -
          finalAverage[
            key
          ]
        )
    );

  const maxError =
    Math.max(
      ...errors
    );

  const tolerance =
    Math.max(
      0.10,
      0.90 /
        Math.sqrt(
          recognized.length
        )
    );

  const pass =
    maxError <=
    tolerance;

  return {
    maxError,
    tolerance,
    check: {
      id:
        'rest-execution',
      label:
        'Actual rest selection vs final probabilities',
      status:
        pass
          ? 'PASS'
          : 'CHECK',
      summary:
        'max error ' +
        (
          maxError *
          100
        ).toFixed(
          1
        ) +
        'pp / tolerance ' +
        (
          tolerance *
          100
        ).toFixed(
          1
        ) +
        'pp at n=' +
        recognized.length +
        '.',
    },
  };
}

function createSocialCheck(
  characterId: CharacterId,
  statistics:
    CharacterRuntimeStatistics,
  channel:
    CharacterSocialChanceChannel
): CharacterPersonalityValidationCheck {
  const samples =
    statistics.socialSamples.filter(
      (sample) =>
        sample.channel ===
        channel
    );

  if (
    samples.length <
    SOCIAL_MIN_SAMPLES
  ) {
    return {
      id:
        'social-' +
        channel,
      label:
        channel,
      status:
        'WAIT',
      summary:
        'Need ' +
        SOCIAL_MIN_SAMPLES +
        ' gate evaluations; current ' +
        samples.length +
        '.',
    };
  }

  const mean =
    average(
      samples.map(
        (sample) =>
          sample.chance
      )
    );

  if (
    mean ===
    null
  ) {
    return {
      id:
        'social-' +
        channel,
      label:
        channel,
      status:
        'WAIT',
      summary:
        'No social chance average available.',
    };
  }

  const profile =
    getCharacterPersonalityProfile(
      characterId
    );

  const expected =
    clamp01(
      SOCIAL_BASE_CHANCE[
        channel
      ] *
      profile.socialChanceMultipliers[
        channel
      ]
    );

  const error =
    Math.abs(
      mean -
      expected
    );

  return {
    id:
      'social-' +
      channel,
    label:
      channel,
    status:
      error <=
      SOCIAL_TOLERANCE
        ? 'PASS'
        : 'CHECK',
    summary:
      'avg ' +
      (
        mean *
        100
      ).toFixed(
        1
      ) +
      '% / expected ' +
      (
        expected *
        100
      ).toFixed(
        1
      ) +
      '% / n=' +
      samples.length +
      '.',
  };
}

function resolveConfidence(
  restSampleCount: number
): CharacterPersonalityValidationConfidence {
  if (
    restSampleCount >=
    REST_STRONG_SAMPLES
  ) {
    return 'strong';
  }

  if (
    restSampleCount >=
    REST_EXECUTION_MIN_SAMPLES
  ) {
    return 'usable';
  }

  return 'warming';
}

// CHARACTER_V79_PERSONALITY_AUTO_VALIDATION
export function validateCharacterPersonalityRuntime(
  characterId: CharacterId,
  statistics:
    CharacterRuntimeStatistics
): CharacterPersonalityValidationReport {
  const signature =
    createSignatureCheck(
      characterId,
      statistics
    );

  const execution =
    createExecutionCheck(
      statistics
    );

  const socialChecks =
    (
      [
        'spontaneousHappy',
        'passiveAttention',
        'bondedFollowUpTouch',
      ] as const
    ).map(
      (channel) =>
        createSocialCheck(
          characterId,
          statistics,
          channel
        )
    );

  const checks = [
    signature.check,
    execution.check,
    ...socialChecks,
  ];

  const hasCheck =
    checks.some(
      (check) =>
        check.status ===
        'CHECK'
    );

  const coreWaiting =
    signature.check.status ===
      'WAIT' ||
    execution.check.status ===
      'WAIT';

  const overallStatus:
    CharacterPersonalityValidationStatus =
    hasCheck
      ? 'CHECK'
      : coreWaiting
        ? 'WAIT'
        : 'PASS';

  return {
    characterId,
    overallStatus,
    confidence:
      resolveConfidence(
        statistics.restSamples.length
      ),
    restSampleCount:
      statistics.restSamples.length,
    socialSampleCount:
      statistics.socialSamples.length,
    personalityDelta:
      signature.delta,
    selectorMaxError:
      execution.maxError,
    selectorTolerance:
      execution.tolerance,
    checks,
  };
}
