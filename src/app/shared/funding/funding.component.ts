import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/translations';
import { ActionButtonComponent } from '../action-button/action-button.component';

@Component({
  selector: 'app-funding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActionButtonComponent],
  templateUrl: './funding.component.html',
})
export class FundingComponent {
  private readonly i18n = inject(I18nService);

  t(key: TranslationKey): string {
    return this.i18n.t(key);
  }
}
