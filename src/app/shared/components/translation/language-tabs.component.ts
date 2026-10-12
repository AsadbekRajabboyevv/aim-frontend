import { Component, input, model } from '@angular/core';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-language-tabs',
  standalone: true,
  imports: [TranslatePipe],
  host: { class: 'inline-flex' },
  template: `
    <div class="flex flex-wrap rounded-xl bg-espresso-50 p-1" role="tablist">
      @for (language of languages(); track language.code) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="active() === language.code"
          [attr.title]="language.isActive ? language.nativeName : language.nativeName + ' — ' + ('common.status.inactive' | t)"
          (click)="active.set(language.code)"
          class="relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition"
          [class]="active() === language.code ? 'bg-surface text-espresso-900 shadow-sm' : 'text-espresso-400 hover:text-espresso-700'"
        >
          <span [class.opacity-50]="!language.isActive">{{ language.code.toUpperCase() }}</span>
          @if (invalidCodes().includes(language.code)) {
            <span class="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500"></span>
          }
        </button>
      }
    </div>
  `
})
export class LanguageTabsComponent {

  readonly languages = input.required<LanguageResponseDto[]>();
  readonly invalidCodes = input<string[]>([]);
  readonly active = model.required<string>();
}
