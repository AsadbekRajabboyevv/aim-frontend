import { Routes } from '@angular/router';
import { ROLE_CAFE_ADMIN, ROLE_SUPER_ADMIN } from './core/constants/api.constants';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent)
  },
  {
    path: 'terms',
    data: { slug: 'terms' },
    loadComponent: () => import('./features/legal/legal-page.component').then((m) => m.LegalPageComponent)
  },
  {
    path: 'privacy',
    data: { slug: 'privacy' },
    loadComponent: () => import('./features/legal/legal-page.component').then((m) => m.LegalPageComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'auth/verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent)
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent)
  },
  {
    path: 'menu/:cafeSlug',
    loadComponent: () =>
      import('./features/public-menu/tablet-menu.component').then((m) => m.TabletMenuComponent)
  },
  {
    path: 'auth/google/callback',
    loadComponent: () =>
      import('./features/auth/google-callback/google-callback.component').then((m) => m.GoogleCallbackComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'super-admin',
        canActivate: [roleGuard],
        data: { roles: [ROLE_SUPER_ADMIN] },
        children: [
          {
            path: 'cafes',
            loadComponent: () =>
              import('./features/super-admin/cafe-list/cafe-list.component').then((m) => m.CafeListComponent)
          },
          {
            path: 'cafes/new',
            loadComponent: () =>
              import('./features/super-admin/cafe-form/cafe-form.component').then((m) => m.CafeFormComponent)
          },
          {
            path: 'cafes/:slug/edit',
            loadComponent: () =>
              import('./features/super-admin/cafe-form/cafe-form.component').then((m) => m.CafeFormComponent)
          },
          {
            path: 'cafes/:slug/menu',
            loadComponent: () =>
              import('./features/super-admin/cafe-menu/cafe-menu.component').then((m) => m.AdminCafeMenuComponent)
          },
          {
            path: 'cafes/:slug/qr',
            loadComponent: () =>
              import('./features/super-admin/cafe-qr/cafe-qr.component').then((m) => m.AdminCafeQrComponent)
          },
          {
            path: 'cafes/:slug/stop-list',
            data: { returnLink: '/super-admin/cafes' },
            loadComponent: () =>
              import('./features/cafes/stop-list/stop-list.component').then((m) => m.StopListComponent)
          },
          {
            path: 'discounts',
            loadComponent: () =>
              import('./features/discounts/discounts.component').then((m) => m.DiscountsComponent)
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./features/super-admin/settings/settings.component').then((m) => m.SettingsComponent)
          },
          {
            path: 'languages',
            loadComponent: () =>
              import('./features/super-admin/languages/languages.component').then((m) => m.LanguagesComponent)
          },
          {
            path: 'system-messages',
            loadComponent: () =>
              import('./features/super-admin/system-messages/system-messages.component').then((m) => m.SystemMessagesComponent)
          },
          {
            path: 'legal',
            loadComponent: () =>
              import('./features/super-admin/legal/legal-editor.component').then((m) => m.LegalEditorComponent)
          },
          {
            path: 'files',
            loadComponent: () =>
              import('./features/super-admin/orphan-files/orphan-files.component').then((m) => m.OrphanFilesComponent)
          },
          {
            path: 'ai-tools',
            loadComponent: () =>
              import('./features/super-admin/ai-tools/ai-tools.component').then((m) => m.AiToolsComponent)
          },
          {
            path: 'ai-settings',
            loadComponent: () =>
              import('./features/super-admin/ai-settings/ai-settings.component').then((m) => m.AiSettingsComponent)
          },
          {
            path: 'plans',
            loadComponent: () =>
              import('./features/super-admin/plans/plans.component').then((m) => m.PlansComponent)
          }
        ]
      },
      {
        path: 'cafe-admin',
        canActivate: [roleGuard],
        data: { roles: [ROLE_CAFE_ADMIN] },
        children: [
          {
            path: 'cafes',
            loadComponent: () =>
              import('./features/cafe-admin/my-cafes/my-cafes.component').then((m) => m.MyCafesComponent)
          },
          {
            path: 'cafes/new',
            loadComponent: () =>
              import('./features/cafe-admin/my-cafe/my-cafe.component').then((m) => m.MyCafeComponent)
          },
          {
            path: 'cafes/:slug/edit',
            loadComponent: () =>
              import('./features/cafe-admin/my-cafe/my-cafe.component').then((m) => m.MyCafeComponent)
          },
          {
            path: 'cafes/:slug/menu',
            loadComponent: () =>
              import('./features/cafe-admin/cafe-menu/cafe-menu.component').then((m) => m.CafeMenuComponent)
          },
          {
            path: 'cafes/:slug/qr',
            loadComponent: () =>
              import('./features/cafe-admin/cafe-qr/cafe-qr.component').then((m) => m.CafeQrComponent)
          },
          {
            path: 'cafes/:slug/stop-list',
            data: { returnLink: '/cafe-admin/cafes' },
            loadComponent: () =>
              import('./features/cafes/stop-list/stop-list.component').then((m) => m.StopListComponent)
          },
          {
            path: 'discounts',
            loadComponent: () =>
              import('./features/discounts/discounts.component').then((m) => m.DiscountsComponent)
          },
          { path: 'my-cafe', pathMatch: 'full', redirectTo: 'cafes' }
        ]
      },
      {
        path: 'billing',
        canActivate: [roleGuard],
        loadComponent: () => import('./features/billing/billing.component').then((m) => m.BillingComponent)
      },
      {
        path: 'profile',
        canActivate: [roleGuard],
        loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent)
      },
      {
        path: 'ai-chat',
        canActivate: [roleGuard],
        loadComponent: () => import('./features/ai-chat/ai-chat.component').then((m) => m.AiChatComponent)
      },
      {
        path: 'ai-chat/:slug',
        canActivate: [roleGuard],
        loadComponent: () => import('./features/ai-chat/ai-chat.component').then((m) => m.AiChatComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
