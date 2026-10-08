import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { I18nService } from '../../core/i18n/i18n.service';
import {
  LOCALE_NATIVE_NAMES,
  LOCALE_PREFERENCES,
  type LocalePreference,
} from '../../core/i18n/translations';

@Component({
  selector: 'app-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-switcher.component.html',
})
export class LanguageSwitcherComponent {
  private readonly i18n = inject(I18nService);

  readonly preference = this.i18n.preference;

  /**
   * 「跟随系统」跟随界面语言显示，zh / en 两项恒用母语，
   * 这样无论当前是中文还是英文界面，都能认出自己要选的那一项。
   */
  readonly options = computed(() =>
    LOCALE_PREFERENCES.map((value) => ({
      value,
      label: value === 'system' ? this.i18n.t('lang.system') : LOCALE_NATIVE_NAMES[value],
    })),
  );

  readonly selectLabel = computed(() => this.i18n.t('lang.label'));

  select(rawValue: string): void {
    this.i18n.setPreference(rawValue as LocalePreference);
  }
}
