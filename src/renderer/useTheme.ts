/**
 * Resolve a preferência de tema ("dark" | "light" | "system") para o valor
 * efetivo aplicado via atributo data-theme no <html>, reagindo em tempo real
 * a mudanças do tema do sistema operacional quando a preferência é "system".
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { useEffect } from 'react';
import { ThemePreference } from './types';

export function useTheme(theme: ThemePreference): void {
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: light)');

    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme;
      document.documentElement.setAttribute('data-theme', resolved);
    };

    apply();
    if (theme === 'system') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
    return undefined;
  }, [theme]);
}
