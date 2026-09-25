import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from '@openng/optimus-ui/api';

export interface ConfirmOptions {
  /** Translation key for the dialog title. */
  header: string;
  /** Translation key for the body text. */
  message: string;
  /** Interpolation params for `message`. */
  params?: Record<string, unknown>;
  /** Translation key for the accept button. */
  acceptLabel: string;
}

/**
 * Promise-based wrapper around Optimus' `ConfirmationService`, rendered by the
 * single `<p-confirmdialog>` in the app shell. Replaces `window.confirm` so the
 * prompt is themed, translated and focus-trapped. Resolves `true` on accept,
 * `false` on cancel / Escape / close.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly #confirmation = inject(ConfirmationService);
  readonly #translate = inject(TranslateService);

  ask({ header, message, params, acceptLabel }: ConfirmOptions): Promise<boolean> {
    const t = (key: string, p?: Record<string, unknown>) => this.#translate.instant(key, p);
    return new Promise((resolve) => {
      this.#confirmation.confirm({
        header: t(header),
        message: t(message, params),
        acceptLabel: t(acceptLabel),
        rejectLabel: t('confirm.cancel'),
        acceptButtonProps: { severity: 'danger' },
        rejectButtonProps: { severity: 'secondary', text: true },
        defaultFocus: 'reject',
        closable: true,
        closeOnEscape: true,
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
