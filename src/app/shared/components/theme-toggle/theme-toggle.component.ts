import { Component, inject, input } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { IconComponent } from '../icon/icon.component';

/** Sun / moon button switching between light and dark mode. */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [IconComponent, TranslatePipe],
  host: { class: 'inline-flex' },
  template: `
    @let label = (theme.isDark() ? 'theme_mode.to_light' : 'theme_mode.to_dark') | t;
    <button
      type="button"
      (click)="theme.toggle()"
      [attr.aria-label]="label"
      [title]="label"
      class="inline-flex items-center justify-center rounded-lg p-2 transition active:scale-90"
      [class]="dark()
        ? 'text-espresso-300 hover:bg-espresso-800 hover:text-white'
        : 'border border-line bg-surface text-espresso-700 hover:border-line-strong hover:bg-canvas'"
    >
      <app-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="16" />
    </button>
  `
})
export class ThemeToggleComponent {

  /** For dark backgrounds (sidebar, mobile header). */
  readonly dark = input<boolean>(false);

  protected readonly theme = inject(ThemeService);
}
