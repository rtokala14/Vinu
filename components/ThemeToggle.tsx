import { Switch } from './ui/switch';

import { setAndroidNavigationBar } from '~/lib/android-navigation-bar';
import { useColorScheme } from '~/lib/useColorScheme';
import { store$ } from '~/stores';

export function ThemeToggle() {
  const { isDarkColorScheme, setColorScheme } = useColorScheme();

  function toggleColorScheme() {
    const newTheme = isDarkColorScheme ? 'light' : 'dark';
    store$.settings.theme.set(newTheme);
    setColorScheme(newTheme);
    setAndroidNavigationBar(newTheme);
  }

  return <Switch checked={isDarkColorScheme} onCheckedChange={toggleColorScheme} />;
}
