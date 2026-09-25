import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideCircleUser, LucideLogIn, LucideLogOut, LucideUserPlus } from '@lucide/angular';
import { Button } from '@openng/optimus-ui/button';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { authControllerMeOptions } from '../api/@tanstack/angular-query-experimental.gen';
import { AuthService } from './auth.service';

/**
 * Header account control. Shows the signed-in email + Log out once `/auth/me`
 * resolves; a Sign in / Create account pair if it does not (a `401` also trips
 * the global redirect in `auth-redirect.ts`, so that branch is a brief
 * fallback). With `AUTH_ENABLED=false` this is the fixed local user.
 */
@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, TranslatePipe, LucideCircleUser, LucideLogOut, LucideLogIn, LucideUserPlus],
  template: `
    @if (me.data(); as user) {
      <div class="flex items-center gap-2 text-sm">
        <span
          class="inline-flex items-center gap-1.5 text-surface-500 dark:text-surface-400"
          [title]="user.email"
        >
          <svg lucideCircleUser class="size-5"></svg>
          <span class="hidden sm:inline">{{ user.email }}</span>
        </span>
        <p-button size="small" severity="secondary" [text]="true" (onClick)="auth.logout()">
          <svg lucideLogOut class="mr-2 size-4"></svg>
          {{ 'auth.logout' | translate }}
        </p-button>
      </div>
    } @else if (me.isError()) {
      <div class="flex items-center gap-2 text-sm">
        <p-button size="small" severity="secondary" [text]="true" (onClick)="auth.register()">
          <svg lucideUserPlus class="mr-2 size-4"></svg>
          {{ 'auth.register' | translate }}
        </p-button>
        <p-button size="small" (onClick)="auth.login()">
          <svg lucideLogIn class="mr-2 size-4"></svg>
          {{ 'auth.signIn' | translate }}
        </p-button>
      </div>
    }
  `,
})
export class UserMenuComponent {
  protected readonly auth = inject(AuthService);
  protected readonly me = injectQuery(() => ({
    ...authControllerMeOptions(),
    retry: false,
    staleTime: Infinity,
  }));
}
