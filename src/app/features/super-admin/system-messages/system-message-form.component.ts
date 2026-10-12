import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { SystemMessageResponseDto } from '../../../core/models/system-message.model';
import { I18nService } from '../../../core/services/i18n.service';
import { SystemMessageService } from '../../../core/services/system-message.service';
import { Translations, cleanTranslations, defaultLanguageCode, requiredTranslation } from '../../../core/utils/translation.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { LanguageTabsComponent } from '../../../shared/components/translation/language-tabs.component';
import { TranslationInputComponent } from '../../../shared/components/translation/translation-input.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-system-message-form',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, InputComponent, ButtonComponent, IconComponent, LanguageTabsComponent, TranslationInputComponent, TranslatePipe],
  template: `
    <app-modal size="lg" [title]="(message() ? 'system_messages.form.title_edit' : 'system_messages.form.title_new') | t"
               [subtitle]="'system_messages.form.subtitle' | t" (closed)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
        <app-input [label]="'common.code' | t" [required]="true" placeholder="error.cafe.not_found" formControlName="code"
                   [hint]="(message() ? 'system_messages.form.code_locked' : 'system_messages.form.code_hint') | t"
                   [invalid]="form.controls.code.invalid && form.controls.code.touched" [errorMessage]="'system_messages.form.code_required' | t" />

        <div class="flex flex-wrap items-center justify-between gap-3">
          <app-language-tabs [languages]="languages()" [(active)]="activeLanguage" [invalidCodes]="invalidCodes()" />
          <span class="text-xs text-espresso-400">{{ 'system_messages.form.filled' | t: { filled: filledCount(), total: languages().length } }}</span>
        </div>
        <app-translation-input
          [label]="'system_messages.form.text' | t"
          formControlName="translations"
          [multiline]="true"
          [rows]="4"
          [language]="activeLanguageDto()"
          [required]="activeLanguage() === defaultLanguage()"
          [invalid]="invalidCodes().includes(activeLanguage())"
          [errorMessage]="'system_messages.form.default_text_required' | t"
        />

        @if (errorMessage()) {
          <div class="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <app-icon name="alert" [size]="18" class="mt-px" />
            {{ errorMessage() }}
          </div>
        }
      </form>

      <ng-container footer>
        <app-button variant="secondary" (clicked)="cancelled.emit()">{{ 'common.cancel' | t }}</app-button>
        <app-button icon="check" [loading]="saving()" (clicked)="submit()">{{ 'common.save' | t }}</app-button>
      </ng-container>
    </app-modal>
  `
})
export class SystemMessageFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly systemMessageService = inject(SystemMessageService);
  private readonly i18n = inject(I18nService);

  readonly message = input<SystemMessageResponseDto | null>(null);
  readonly languages = input.required<LanguageResponseDto[]>();

  readonly saved = output<SystemMessageResponseDto>();
  readonly cancelled = output<void>();

  protected readonly defaultLanguage = computed(() => defaultLanguageCode(this.languages()));
  protected readonly activeLanguage = signal('');
  protected readonly activeLanguageDto = computed(() => this.languages().find((l) => l.code === this.activeLanguage()));
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  private readonly translationsMissing = signal(false);
  private readonly current = signal<Translations>({});

  protected readonly invalidCodes = computed(() => (this.translationsMissing() ? [this.defaultLanguage()] : []));
  protected readonly filledCount = computed(() =>
    this.languages().filter((language) => this.current()[language.code]?.trim()).length);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(150)]],
    translations: this.fb.nonNullable.control<Translations>({})
  });

  ngOnInit(): void {
    this.activeLanguage.set(this.defaultLanguage());
    this.form.controls.translations.setValidators(requiredTranslation(this.defaultLanguage()));
    this.form.controls.translations.valueChanges.subscribe((value) => this.current.set(value));

    const message = this.message();
    if (message) {
      this.form.patchValue({ code: message.code, translations: { ...message.translations } });
      this.form.controls.code.disable();
    }
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    this.translationsMissing.set(this.form.controls.translations.invalid);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.activeLanguage.set(this.defaultLanguage());
      return;
    }
    const value = this.form.getRawValue();
    const dto = { code: value.code.trim(), translations: cleanTranslations(value.translations) };
    const message = this.message();
    const save$ = message ? this.systemMessageService.update(message.code, dto) : this.systemMessageService.create(dto);

    this.saving.set(true);
    this.errorMessage.set('');
    save$.subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.data) {
          this.saved.emit(response.data);
        }
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.save'));
      }
    });
  }
}
