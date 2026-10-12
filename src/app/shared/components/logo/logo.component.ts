import { Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  host: { class: 'inline-flex items-center' },
  template: `
    <!-- The logo has black lettering, so on dark backgrounds (and in dark mode) it sits on a white plate -->
    <span class="inline-flex items-center"
          [class]="dark() ? 'rounded-xl bg-white px-2.5 py-1.5 shadow-card' : 'dark:rounded-xl dark:bg-white dark:px-2.5 dark:py-1.5'">
      <img src="logo.png" alt="AIM" [style.height.px]="size()" class="block w-auto select-none" draggable="false" />
    </span>
  `
})
export class LogoComponent {

  readonly size = input<number>(36);
  readonly dark = input<boolean>(false);
}
