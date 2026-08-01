const BAD_WORDS = [
  '시발',
  '씨발',
  'ㅅㅂ',
  '병신',
  'ㅂㅅ',
  '좆',
  '존나',
  '개새끼',
] as const;

const ONLY_KOREAN_CONSONANTS =
  /^[ㄱ-ㅎ\s]+$/;

const ONLY_KOREAN_VOWELS =
  /^[ㅏ-ㅣ\s]+$/;

const CONTROL_CHARACTERS =
  /[\u0000-\u001F\u007F]/g;

const ZERO_WIDTH_CHARACTERS =
  /[\u200B-\u200D\uFEFF]/g;

export type ValidateTextOptions = {
  label: string;
  min?: number;
  max?: number;
  allowSpace?: boolean;
};

function normalizeText(
  value: unknown
) {
  return String(value ?? '')
    .replace(
      CONTROL_CHARACTERS,
      ''
    )
    .replace(
      ZERO_WIDTH_CHARACTERS,
      ''
    )
    .normalize('NFC')
    .trim();
}

function normalizeForBadWordCheck(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /[\s.,!?~`'"“”‘’()[\]{}<>_\-+=|\\/·•:;@#$%^&*]+/g,
      ''
    )
    .replace(
      /(.)\1{2,}/g,
      '$1$1'
    );
}

function containsBadWord(
  value: string
) {
  const normalized =
    normalizeForBadWordCheck(
      value
    );

  return BAD_WORDS.some(
    (word) => {
      const normalizedWord =
        normalizeForBadWordCheck(
          word
        );

      return normalized.includes(
        normalizedWord
      );
    }
  );
}

export const validateText = (
  value: string,
  options: ValidateTextOptions
): string | null => {
  const text =
    normalizeText(value);

  const label =
    options.label?.trim() ||
    '내용';

  if (
    options.min != null &&
    text.length <
      options.min
  ) {
    return `${label}은(는) 최소 ${options.min}자 이상 입력해주세요.`;
  }

  if (
    options.max != null &&
    text.length >
      options.max
  ) {
    return `${label}은(는) 최대 ${options.max}자까지 입력할 수 있어요.`;
  }

  if (
    options.allowSpace ===
      false &&
    /\s/.test(text)
  ) {
    return `${label}에는 띄어쓰기를 사용할 수 없어요.`;
  }

  if (
    text.length > 0 &&
    ONLY_KOREAN_CONSONANTS.test(
      text
    )
  ) {
    return `${label}은(는) 자음만 입력할 수 없어요.`;
  }

  if (
    text.length > 0 &&
    ONLY_KOREAN_VOWELS.test(
      text
    )
  ) {
    return `${label}은(는) 모음만 입력할 수 없어요.`;
  }

  if (
    containsBadWord(text)
  ) {
    return `${label}에 사용할 수 없는 표현이 포함되어 있어요.`;
  }

  return null;
};

export const sanitizeText = (
  value: string
) => {
  return normalizeText(value);
};

export const hasBadWord = (
  value: string
) => {
  return containsBadWord(
    normalizeText(value)
  );
};