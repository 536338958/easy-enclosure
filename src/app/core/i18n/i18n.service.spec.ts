import { TestBed } from '@angular/core/testing';

import { I18nService, LOCALE_STORAGE_KEY } from './i18n.service';
import {
  DICTIONARIES,
  LOCALE_HTML_LANG,
  LOCALES,
  LOCALE_PREFERENCES,
  ZH,
  type TranslationKey,
} from './translations';

describe('translations', () => {
  const keys = Object.keys(ZH) as TranslationKey[];

  it('covers every key in each locale', () => {
    for (const locale of LOCALES) {
      for (const key of keys) {
        expect(DICTIONARIES[locale][key]).withContext(`${locale}.${key}`).toBeTruthy();
      }
    }
  });

  it('keeps the placeholder set identical across locales', () => {
    const placeholders = (text: string): string[] =>
      (text.match(/\{(\w+)\}/g) ?? []).slice().sort();

    for (const key of keys) {
      expect(placeholders(DICTIONARIES.en[key]))
        .withContext(key)
        .toEqual(placeholders(DICTIONARIES.zh[key]));
    }
  });

  it('offers system plus every supported locale', () => {
    expect(LOCALE_PREFERENCES).toEqual(['system', 'zh', 'en']);
  });
});

describe('I18nService', () => {
  beforeEach(() => {
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    TestBed.configureTestingModule({});
  });

  it('defaults to following the system', () => {
    const i18n = TestBed.inject(I18nService);

    expect(i18n.preference()).toBe('system');
    expect(i18n.locale()).toBe(i18n.systemLocale);
  });

  it('resolves the system preference to a supported locale', () => {
    const i18n = TestBed.inject(I18nService);

    expect(LOCALES).toContain(i18n.systemLocale);
    expect(DICTIONARIES[i18n.locale()]).toBeTruthy();
  });

  it('restores an explicit stored preference', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');

    const i18n = TestBed.inject(I18nService);
    expect(i18n.preference()).toBe('en');
    expect(i18n.locale()).toBe('en');
    expect(i18n.t('sidebar.params')).toBe('Parameters');
  });

  it('persists an explicit choice and switches the dictionary', () => {
    const i18n = TestBed.inject(I18nService);

    i18n.setPreference('zh');
    expect(i18n.locale()).toBe('zh');
    expect(i18n.t('sidebar.params')).toBe('参数');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh');

    i18n.setPreference('en');
    expect(i18n.dictionary()['tools.load']).toBe('Load');

    // 切回「跟随系统」时写入的偏好值也要跟着更新
    i18n.setPreference('system');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('system');
    expect(i18n.locale()).toBe(i18n.systemLocale);
  });

  it('falls back to following the system for unknown stored values', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'klingon');

    expect(TestBed.inject(I18nService).preference()).toBe('system');
  });

  it('ignores an unsupported preference', () => {
    const i18n = TestBed.inject(I18nService);
    i18n.setPreference('zh');

    i18n.setPreference('klingon' as 'zh');
    expect(i18n.preference()).toBe('zh');
  });

  it('interpolates named placeholders', () => {
    const i18n = TestBed.inject(I18nService);
    i18n.setPreference('en');

    expect(i18n.t('params.mountItem', { n: 3 })).toBe('Mount 3');
    // 缺失的变量原样保留，便于发现漏传
    expect(i18n.t('params.mountItem')).toBe('Mount {n}');
  });

  it('syncs the document lang attribute with the effective locale', () => {
    const i18n = TestBed.inject(I18nService);

    i18n.setPreference('zh');
    expect(document.documentElement.lang).toBe('zh-CN');

    i18n.setPreference('en');
    expect(document.documentElement.lang).toBe('en');

    i18n.setPreference('system');
    expect(document.documentElement.lang).toBe(LOCALE_HTML_LANG[i18n.systemLocale]);
  });
});
