import { UserReactionState } from './types';

export const getLikeKeyRedis = (postId) => `${postId}:like`;
export const getUnLikeKeyRedis = (postId) => `${postId}:unlike`;
export const getUserReactionKeyRedis = (postId, userId) =>
  `${postId}:${userId}`;
export const getUserReactionState = (
  currentUserReaction: UserReactionState,
  updatedUserReaction: UserReactionState,
) => {
  if (currentUserReaction === updatedUserReaction) {
    return UserReactionState.Idle;
  }

  return updatedUserReaction;
};
