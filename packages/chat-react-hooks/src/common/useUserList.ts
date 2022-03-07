import { useCallback, useMemo, useRef, useState } from 'react';
import type Sendbird from 'sendbird';

import { SendbirdChatSDK, useAsyncEffect } from '@sendbird/uikit-utils';

import type { CustomQueryInterface, UseUserList, UseUserListOptions } from '../types';

const createUserQuery = <User>(sdk: SendbirdChatSDK, queryCreator?: UseUserListOptions<User>['queryCreator']) => {
  if (queryCreator) return queryCreator();
  sdk.createFriendListQuery();
  return sdk.createApplicationUserListQuery() as unknown as CustomQueryInterface<User>;
};

/**
 * Get user list from query.
 * default query uses 'instance.createApplicationUserListQuery'
 * The response type of hook is depends on return type of 'query.next()'
 *
 * You can call hook with your custom query using {@link CustomQuery}
 * Or you can create your 'CustomQueryClass' implemented {@link CustomQueryInterface}'
 *
 * ```example
 *  const { users } = useUserList(sdk, {
 *    queryCreator: () => {
 *      const friendQuery = sdk.createFriendListQuery();
 *      return new CustomQuery({
 *        next: () => friendQuery.next(),
 *        isLoading: () => friendQuery.isLoading,
 *        hasNext: () => friendQuery.hasMore,
 *      });
 *    }
 *  })
 * ```
 * */
export const useUserList = <
  Options extends UseUserListOptions<QueriedUser>,
  QueriedUser = Options['queryCreator'] extends () => CustomQueryInterface<infer User> ? User : Sendbird.User,
>(
  sdk: SendbirdChatSDK,
  options?: Options,
): UseUserList<QueriedUser> => {
  const query = useRef<CustomQueryInterface<QueriedUser>>();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [users, setUsers] = useState<QueriedUser[]>([]);
  const sortedUsers = useMemo((): QueriedUser[] => {
    if (options?.sortComparator) return users.sort(options.sortComparator);
    return users;
  }, [users, options?.sortComparator]);

  // ---------- internal methods ------------ //
  const updateUsers = (users: QueriedUser[]) => {
    setUsers((prev) => prev.concat(users));
  };
  const clearUsers = () => {
    setUsers([]);
  };
  const init = useCallback(async () => {
    clearUsers();
    query.current = createUserQuery<QueriedUser>(sdk, options?.queryCreator);
    await next();
  }, [sdk, options?.queryCreator]);
  // ---------- internal methods ends ------------ //

  // ---------- internal hooks ------------ //
  useAsyncEffect(async () => {
    setLoading(true);
    await init();
    setLoading(false);
  }, [init]);
  // ---------- internal hooks ends ------------ //

  // ---------- returns methods ---------- //
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await init();
    setRefreshing(false);
  }, [init]);

  const next = useCallback(async () => {
    if (query.current && query.current?.hasNext) {
      updateUsers(await query.current?.next());
    }
  }, []);
  // ---------- returns methods ends ---------- //

  return {
    loading,
    refreshing,
    refresh,
    users: sortedUsers,
    next,
  };
};