import { Injectable, computed, signal } from '@angular/core';

import {
  DICTIONARIES,
  LOCALE_HTML_LANG,
  LOCALE_PREFERENCES,
  LOCALES,
  type Locale,
  type LocalePreference,
  type TranslationKey,
} from './translations';

export const LOCALE_STORAGE_KEY = 'easy-enclosure.locale';

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** 读偏好值：localStorage 里的值必须是已知项，否则退回「跟随系统」 */
function readStoredPreference(): LocalePreference {
  if (typeof localStorage === 'undefined') {
    return 'system';
  }

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'system' || isLocale(stored)) {
    return stored;
  }

  return 'system';
}

/** 浏览器语言推断出的界面语言，推断不出时退回中文 */
function detectSystemLocale(): Locale {
  if (typeof navigator !== 'undefined') {
    const languages = navigator.languages ?? [navigator.language];
    for (const language of languages) {
      if (typeof language === 'string' && language.toLowerCase().startsWith('zh')) {
        return 'zh';
      }
      if (typeof language === 'string' && language.toLowerCase().startsWith('en')) {
        return 'en';
      }
    }
  }

  return 'zh';
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  /** 用户在下拉框里选的值，默认「跟随系统」 */
  readonly preference = signal<LocalePreference>(readStoredPreference());

  /** 实际生效的语言：system 会被解析成 zh / en */
  readonly locale = computed<Locale>(() => {
    const preference = this.preference();
    return preference === 'system' ? this.systemLocale : preference;
  });

  /** 模板里读这个 signal，切换语言时组件才会被标记为脏并重新渲染 */
  readonly dictionary = computed(() => DICTIONARIES[this.locale()]);

  readonly systemLocale: Locale = detectSystemLocale();

  constructor() {
    this.applyDocumentLang(this.locale());
  }

  setPreference(next: LocalePreference): void {
    if (!this.isPreference(next) || next === this.preference()) {
      return;
    }
    this.preference.set(next);
    this.applyDocumentLang(this.locale());

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        // 隐私模式下写入会抛异常，内存里的语言切换依然有效，忽略即可
      }
    }
  }

  /** 用 `{name}` 占位符做插值，缺失的变量原样保留，便于发现漏传 */
  t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const template = this.dictionary()[key];
    if (!vars) {
      return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in vars ? String(vars[name]) : match,
    );
  }

  private isPreference(value: string): value is LocalePreference {
    return (LOCALE_PREFERENCES as readonly string[]).includes(value);
  }

  private applyDocumentLang(locale: Locale): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = LOCALE_HTML_LANG[locale];
    }
  }
}
