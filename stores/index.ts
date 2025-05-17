import { observable } from '@legendapp/state';

import { User } from '~/api/models';

export const store$ = observable({
  settings: {
    theme: 'system' as 'light' | 'dark',
    serverUrl: '' as string,
  },
  user: undefined as User | undefined,
  userToken: undefined as string | undefined,
  isAuthorized: (): boolean => {
    return !!store$.user.get() && !!store$.userToken.get();
  },
});
