import { observable } from '@legendapp/state';

import { User } from '~/api/models';

export const store$ = observable({
  settings: {
    theme: 'system' as 'light' | 'dark' | 'system',
    serverUrl: '' as string,
    playbackRate: 1 as number,
    jumpForwardSec: 30 as number,
    jumpBackwardsSec: 30 as number,
    /** Daily listening goal in minutes; 0 disables the goal UI. */
    goalMinutesPerDay: 0 as number,
    /** Rewind-on-resume scaled by time away; on by default. */
    smartRewind: true as boolean,
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
