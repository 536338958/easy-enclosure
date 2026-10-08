import { ComponentFixture, TestBed } from '@angular/core/testing';

import { I18nService, LOCALE_STORAGE_KEY } from '../../core/i18n/i18n.service';
import { LanguageSwitcherComponent } from './language-switcher.component';

describe('LanguageSwitcherComponent', () => {
  let fixture: ComponentFixture<LanguageSwitcherComponent>;
  let i18n: I18nService;

  beforeEach(async () => {
    // 落在本 spec 之前跑过的用例可能已把语言偏好写进 localStorage，
    // 不清掉的话这里拿到的初始值就不是「跟随系统」了
    localStorage.removeItem(LOCALE_STORAGE_KEY);

    await TestBed.configureTestingModule({
      imports: [LanguageSwitcherComponent],
    }).compileComponents();

    // 固定成中文界面，断言文案才与浏览器语言无关
    i18n = TestBed.inject(I18nService);
    i18n.setPreference('zh');

    fixture = TestBed.createComponent(LanguageSwitcherComponent);
    fixture.detectChanges();
  });

  function select(): HTMLSelectElement {
    return fixture.nativeElement.querySelector('select');
  }

  function optionLabels(): (string | null)[] {
    return Array.from(select().querySelectorAll('option')).map(
      (option) => option.textContent?.trim() ?? null,
    );
  }

  it('offers system plus both locales in a dropdown', () => {
    expect(select()).not.toBeNull();
    expect(optionLabels()).toEqual(['跟随系统', '中文', 'English']);
  });

  it('reflects the current preference', () => {
    expect(select().value).toBe('zh');

    i18n.setPreference('en');
    fixture.detectChanges();

    expect(select().value).toBe('en');
    expect(optionLabels()).toEqual(['Follow system', '中文', 'English']);
  });

  it('defaults to following the system', () => {
    i18n.setPreference('system');
    fixture.detectChanges();

    expect(select().value).toBe('system');
  });

  it('applies the choice made in the dropdown', () => {
    select().value = 'en';
    select().dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(i18n.preference()).toBe('en');
    expect(i18n.locale()).toBe('en');

    select().value = 'system';
    select().dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(i18n.preference()).toBe('system');
    expect(i18n.locale()).toBe(i18n.systemLocale);
  });

  it('labels the dropdown in the active language', () => {
    expect(select().getAttribute('aria-label')).toBe('界面语言');

    i18n.setPreference('en');
    fixture.detectChanges();

    expect(select().getAttribute('aria-label')).toBe('Interface language');
  });
});
