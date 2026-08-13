import { observable } from '@legendapp/state';

import { User } from '~/api/models';

export const store$ = observable({
  settings: {
    theme: 'system' as 'light' | 'dark' | 'system',
    serverUrl: '' as string,
    playbackRate: 1 as number,
    jumpForwardSec: 30 as number,
    jumpBackwardsSec: 30 as number,
  },
  user: undefined as User | undefined,
  userToken: undefined as string | undefined,
  currentLibraryId: undefined as string | undefined,
  isAuthorized: (): boolean => {
    return !!store$.user.get() && !!store$.userToken.get();
  },
});

export function clearAuth() {
  store$.user.set(undefined);
  store$.userToken.set(undefined);
}
