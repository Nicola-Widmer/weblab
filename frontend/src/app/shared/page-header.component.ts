import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Title row shared by the top-level pages: the page heading on the left and
 * any projected actions (buttons) on the right. A fixed row height keeps the
 * title and actions at the same spot on every page, with or without actions.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mb-4 flex min-h-10 items-center justify-between gap-3' },
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">{{ title() }}</h1>
    <div class="flex items-center gap-2">
      <ng-content />
    </div>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
}
