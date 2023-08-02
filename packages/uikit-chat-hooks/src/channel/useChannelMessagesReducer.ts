import { useReducer } from 'react';

import { SendableMessage } from '@sendbird/chat/lib/__definition';
import { SendingStatus } from '@sendbird/chat/message';
import type { SendbirdBaseMessage } from '@sendbird/uikit-utils';
import { SendbirdMessage, arrayToMapWithGetter, isMyMessage, isNewMessage, useIIFE } from '@sendbird/uikit-utils';

type Options = {
  sortComparator?: (a: SendbirdMessage, b: SendbirdMessage) => number;
};

type Action =
  | {
      type: 'update_loading' | 'update_refreshing';
      value: { status: boolean };
    }
  | {
      type: 'update_messages' | 'update_new_messages';
      value: { messages: SendbirdBaseMessage[]; clearBeforeAction: boolean; currentUserId?: string };
    }
  | {
      type: 'delete_messages' | 'delete_new_messages';
      value: { messageIds: number[]; reqIds: string[] };
    };

type State = {
  loading: boolean;
  refreshing: boolean;
  messageMap: Record<string, SendbirdBaseMessage>;
  newMessageMap: Record<string, SendbirdBaseMessage>;
};

const defaultReducer = ({ ...draft }: State, action: Action) => {
  switch (action.type) {
    case 'update_refreshing': {
      draft['refreshing'] = action.value.status;
      return draft;
    }
    case 'update_loading': {
      draft['loading'] = action.value.status;
      return draft;
    }
    case 'update_messages': {
      const userId = action.value.currentUserId;

      if (action.value.clearBeforeAction) {
        draft['messageMap'] = arrayToMapWithGetter(action.value.messages, (it) => getMessageId(it, userId));
      } else {
        // Filtering meaningless sendingStatus transition
        const nextMessages = action.value.messages.filter((next) => {
          if (isMyMessage(next, userId)) {
            const prev = draft['messageMap'][getMessageId(next, userId)];
            if (isMyMessage(prev, userId)) return shouldTransitionSendingStatus(prev, next);
          }
          return true;
        });

        // Remove existing messages before update for prevent duplicate display
        nextMessages.map((it) => getMessageId(it, userId)).forEach((key) => delete draft['messageMap'][key]);

        draft['messageMap'] = {
          ...draft['messageMap'],
          ...arrayToMapWithGetter(nextMessages, (it) => getMessageId(it, userId)),
        };
      }

      return draft;
    }
    case 'update_new_messages': {
      const userId = action.value.currentUserId;
      const newMessages = action.value.messages.filter((it) => isNewMessage(it, userId));

      if (action.value.clearBeforeAction) {
        draft['newMessageMap'] = arrayToMapWithGetter(newMessages, (it) => getMessageId(it, userId));
      } else {
        // Remove existing messages before update for prevent duplicate display
        const messageKeys = newMessages.map((it) => it.messageId);
        messageKeys.forEach((key) => delete draft['newMessageMap'][key]);

        draft['newMessageMap'] = {
          ...draft['newMessageMap'],
          ...arrayToMapWithGetter(newMessages, (it) => getMessageId(it, userId)),
        };
      }

      return draft;
    }
    case 'delete_messages':
    case 'delete_new_messages': {
      const key = action.type === 'delete_messages' ? 'messageMap' : 'newMessageMap';
      draft[key] = { ...draft[key] };
      action.value.messageIds.forEach((msgId) => delete draft[key][msgId]);
      action.value.reqIds.forEach((reqId) => delete draft[key][reqId]);

      return draft;
    }
  }
};

const shouldTransitionSendingStatus = (prev: SendableMessage, next: SendableMessage) => {
  if (prev.sendingStatus === SendingStatus.SUCCEEDED) return false;
  return prev.sendingStatus !== next.sendingStatus;
};

const getMessageId = (message: SendbirdBaseMessage, userId?: string) => {
  if (isMyMessage(message, userId) && message.reqId) {
    return message.reqId;
  }
  return String(message.messageId);
};

export const useChannelMessagesReducer = (sortComparator?: Options['sortComparator']) => {
  const [{ loading, refreshing, messageMap, newMessageMap }, dispatch] = useReducer(defaultReducer, {
    loading: true,
    refreshing: false,
    messageMap: {},
    newMessageMap: {},
  });

  const updateMessages = (messages: SendbirdBaseMessage[], clearBeforeAction: boolean, currentUserId?: string) => {
    dispatch({ type: 'update_messages', value: { messages, clearBeforeAction, currentUserId } });
  };
  const deleteMessages = (messageIds: number[], reqIds: string[]) => {
    dispatch({ type: 'delete_messages', value: { messageIds, reqIds } });
  };
  const updateNewMessages = (messages: SendbirdBaseMessage[], clearBeforeAction: boolean, currentUserId?: string) => {
    dispatch({ type: 'update_new_messages', value: { messages, clearBeforeAction, currentUserId } });
  };
  const deleteNewMessages = (messageIds: number[], reqIds: string[]) => {
    dispatch({ type: 'delete_new_messages', value: { messageIds, reqIds } });
  };
  const updateLoading = (status: boolean) => {
    dispatch({ type: 'update_loading', value: { status } });
  };
  const updateRefreshing = (status: boolean) => {
    dispatch({ type: 'update_refreshing', value: { status } });
  };

  const messages = useIIFE(() => {
    if (sortComparator) return Object.values(messageMap).sort(sortComparator);
    return Object.values(messageMap);
  });
  const newMessages = Object.values(newMessageMap);

  return {
    updateLoading,
    updateRefreshing,
    updateMessages,
    deleteMessages,

    loading,
    refreshing,
    messages,

    newMessages,
    updateNewMessages,
    deleteNewMessages,
  };
};
