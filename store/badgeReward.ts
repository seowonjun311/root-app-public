import * as Notifications from 'expo-notifications';

import {
  checkNewEarnedBadges,
  getEarnedBadges,
  type RootBadge,
} from './rootMemory';

type CheckBadgeRewardOptions = {
  onNewBadge?: (
    badge: RootBadge
  ) => void;

  onEarnedBadgesChange?: (
    badges: RootBadge[]
  ) => void;
};

async function showBadgeNotification(
  badge: RootBadge
) {
  try {
    const permission =
      await Notifications.getPermissionsAsync();

    if (
      permission.status !== 'granted'
    ) {
      console.log(
        'BADGE NOTIFICATION SKIPPED: 알림 권한 없음'
      );

      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏅 새로운 뱃지 획득!',
        body: `${badge.icon} ${badge.title}`,
        sound: 'default',
        data: {
          type: 'badge',
          badgeId: badge.id,
        },
      },
      trigger: null,
    });
  } catch (error) {
    console.log(
      'BADGE NOTIFICATION ERROR',
      error
    );
  }
}

export const checkBadgeReward =
  async (
    onNewBadge?: (
      badge: RootBadge
    ) => void,
    onEarnedBadgesChange?: (
      badges: RootBadge[]
    ) => void
  ) => {
    try {
      const newBadges =
        await checkNewEarnedBadges();

      if (
        !newBadges ||
        newBadges.length === 0
      ) {
        return [];
      }

      const nextEarned =
        getEarnedBadges();

      onEarnedBadgesChange?.(
        nextEarned
      );

      const firstBadge =
        newBadges[0];

      if (firstBadge) {
        onNewBadge?.(firstBadge);

        await showBadgeNotification(
          firstBadge
        );
      }

      return newBadges;
    } catch (error) {
      console.log(
        'CHECK BADGE REWARD ERROR',
        error
      );

      return [];
    }
  };

export const checkBadgeRewardWithOptions =
  async ({
    onNewBadge,
    onEarnedBadgesChange,
  }: CheckBadgeRewardOptions) => {
    return checkBadgeReward(
      onNewBadge,
      onEarnedBadgesChange
    );
  };