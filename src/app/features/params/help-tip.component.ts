import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/translations';

/** 气泡与视口边缘的最小间距 */
const TIP_MARGIN = 8;
const TIP_MAX_WIDTH = 200;
const TIP_MIN_WIDTH = 140;
/** 图标上方至少要留这么多空间才向上展开，否则翻到下方 */
const TIP_SPACE_ABOVE = 110;

/**
 * 参数标签旁的「叹号」说明图标：悬停或键盘聚焦时弹出该参数的用途 / 方向说明。
 *
 * 两个反直觉的点，都是踩过坑才定下来的：
 *
 * 1. **气泡必须用 `position: fixed`**。参数面板本身是 `overflow-y: scroll` 容器，
 *    而 CSS 规定 `overflow-y` 非 visible 时另一轴会被强制成 auto —— 于是 absolute
 *    定位的气泡一旦超出面板宽度就被裁掉（表现为「说明文字显示不完整」）。
 *    fixed 定位相对视口，不受任何祖先的 overflow 影响。
 * 2. **变量用标量 input 传入**（hintValue / hintMin / hintMax）而不是对象字面量。
 *    模板里每轮变更检测都会新建对象，会让 input signal 永远判定「变了」，反复触发
 *    变更检测。
 */
@Component({
  selector: 'app-help-tip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="help-tip" tabindex="0" (mouseenter)="reposition()" (focus)="reposition()">
      <svg
        class="help-icon"
        viewBox="0 0 16 16"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.75" />
        <path d="M8 7v4.5M8 4.75v.5" stroke-linecap="round" />
      </svg>
      <span
        class="help-tooltip"
        [class.help-tip-below]="pos().below"
        role="tooltip"
        [style.left.px]="pos().left"
        [style.top.px]="pos().top"
        [style.width.px]="pos().width"
        [style.--arrow-x.px]="pos().arrowX"
        >{{ text() }}</span
      >
    </span>
  `,
  styles: [
    `
      .help-tip {
        position: relative;
        display: inline-flex;
        align-items: center;
        margin-left: 4px;
        vertical-align: -1px;
        cursor: help;
        color: var(--text-secondary);
        outline: none;
      }

      .help-tip:hover,
      .help-tip:focus-visible {
        color: var(--ui-primary);
      }

      .help-tip:focus-visible .help-icon {
        outline: 2px solid var(--focus-ring);
        outline-offset: 1px;
        border-radius: 999px;
      }

      .help-icon {
        width: 12px;
        height: 12px;
        opacity: 0.75;
        transition: opacity 140ms ease;
      }

      .help-tip:hover .help-icon {
        opacity: 1;
      }

      .help-tooltip {
        visibility: hidden;
        opacity: 0;
        /* 见类注释：fixed 才能逃出面板的 overflow 裁剪 */
        position: fixed;
        z-index: 50;
        box-sizing: border-box;
        padding: 6px 9px;
        background: #1f2f42;
        color: #f1f5f9;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.35;
        letter-spacing: normal;
        text-transform: none;
        border-radius: 6px;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.28);
        pointer-events: none;
        white-space: normal;
        word-break: break-word;
        /* 以图标上边缘为基线，再上移自身高度 + 6px 间隙 */
        transform: translateY(calc(-100% - 6px));
        transition:
          opacity 140ms ease,
          visibility 140ms ease;
      }

      .help-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: var(--arrow-x, 8px);
        margin-left: -4px;
        border-width: 4px 4px 0 4px;
        border-style: solid;
        border-color: #1f2f42 transparent transparent transparent;
      }

      /* 上方空间不足时翻到图标下方展开 */
      .help-tip-below {
        transform: translateY(6px);
      }

      .help-tip-below::after {
        top: auto;
        bottom: 100%;
        border-width: 0 4px 4px 4px;
        border-color: transparent transparent #1f2f42 transparent;
      }

      .help-tip:hover .help-tooltip,
      .help-tip:focus-visible .help-tooltip {
        visibility: visible;
        opacity: 1;
      }
    `,
  ],
})
export class HelpTipComponent {
  private readonly i18n = inject(I18nService);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** 说明文案的 i18n key，跟随当前语言切换 */
  readonly hintKey = input.required<TranslationKey>();

  /**
   * 文案里 `{value}` / `{min}` / `{max}` 的替换值。
   * 刻意用标量而不是对象字面量传入，原因见类注释第 2 点。
   */
  readonly hintValue = input<string | number | undefined>(undefined);
  readonly hintMin = input<string | number | undefined>(undefined);
  readonly hintMax = input<string | number | undefined>(undefined);

  readonly text = computed(() => {
    const vars: Record<string, string | number> = {};
    const value = this.hintValue();
    const min = this.hintMin();
    const max = this.hintMax();
    if (value !== undefined) {
      vars['value'] = value;
    }
    if (min !== undefined) {
      vars['min'] = min;
    }
    if (max !== undefined) {
      vars['max'] = max;
    }
    return this.i18n.t(this.hintKey(), Object.keys(vars).length > 0 ? vars : undefined);
  });

  /** 气泡的定位结果，每次悬停 / 聚焦前重算 */
  readonly pos = signal({ left: 0, top: 0, width: TIP_MAX_WIDTH, arrowX: 8, below: false });

  /**
   * 悬停 / 聚焦时重新测量。语言切换、面板宽度变化、页面滚动都会改变可用空间，
   * 所以每次弹出前都重算一次放在哪、多宽、箭头指向哪里。
   */
  reposition(): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const viewport = window.innerWidth;
    const width = Math.round(
      Math.max(TIP_MIN_WIDTH, Math.min(TIP_MAX_WIDTH, viewport - TIP_MARGIN * 2)),
    );

    // 默认与图标左边缘对齐向右展开；右侧放不下就改成向左展开
    let left = rect.left - 4;
    if (left + width > viewport - TIP_MARGIN) {
      left = rect.right + 4 - width;
    }
    left = Math.max(TIP_MARGIN, Math.min(left, viewport - TIP_MARGIN - width));

    const below = rect.top < TIP_SPACE_ABOVE;
    const top = below ? rect.bottom : rect.top;

    // 箭头指向图标中心（相对气泡左边缘），并夹在圆角内侧
    const arrowX = Math.max(10, Math.min(width - 10, rect.left + rect.width / 2 - left));

    this.pos.set({
      left: Math.round(left),
      top: Math.round(top),
      width,
      arrowX: Math.round(arrowX),
      below,
    });
  }
}
