export type LedgerInputSource =
  | 'manual'
  | 'notification'
  | 'meal';

export type LedgerItem = {
  id: string;

  type:
    | 'expense'
    | 'income';

  category: string;
  memo: string;
  amount: number;

  /*
   * 기존 데이터에는 없을 수 있으므로
   * 모두 선택 필드로 둡니다.
   */
  paymentMethod?: string;

  merchantName?: string;

  inputSource?:
    LedgerInputSource;

  autoSaved?: boolean;

  sourcePackage?: string;

  notificationFingerprint?:
    string;

  /*
   * 실제 결제 시각입니다.
   * 날짜별 객체의 key와 별도로 보관합니다.
   */
  occurredAt?: string;

  cancelled?: boolean;

  cancelledAt?: string;

  cancellationFingerprint?: string;
  cancellationFingerprintHistory?: string[];
};

export type LedgerPendingType =
  | 'expense'
  | 'cancel';

export type LedgerPendingStatus =
  | 'pending'
  | 'saved'
  | 'ignored';

export type LedgerPendingItem = {
  id: string;

  type:
    LedgerPendingType;

  status:
    LedgerPendingStatus;

  amount: number;

  merchant: string;

  category: string;

  paymentMethod: string;

  sourcePackage: string;

  sourceAppName: string;

  occurredAt: string;

  receivedAt: string;

  notificationTitle: string;

  notificationText: string;

  fingerprint: string;

  confidence?: number;

  linkedLedgerId?: string;
};