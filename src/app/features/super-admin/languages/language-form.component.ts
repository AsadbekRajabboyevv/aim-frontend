import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { I18nService } from '../../../core/services/i18n.service';
import { LanguageService } from '../../../core/services/language.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-language-form',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, InputComponent, ToggleComponent, ButtonComponent, IconComponent, TranslatePipe],
  template: `
    <app-modal [title]="(language() ? 'languages.form.title_edit' : 'languages.new') | t"
               [subtitle]="'languages.form.subtitle' | t" (closed)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
        <div class="grid gap-5 sm:grid-cols-2">
          <app-input [label]="'languages.form.code' | t" [required]="true" placeholder="tr" formControlName="code"
                     [hint]="(language() ? 'languages.form.code_locked' : 'languages.form.code_hint') | t"
                     [invalid]="form.controls.code.invalid && form.controls.code.touched" [errorMessage]="'languages.form.code_invalid' | t" />
          <app-input [label]="'languages.form.sort_order' | t" type="number" formControlName="sortOrder" [hint]="'languages.form.sort_order_hint' | t" />
        </div>
        <div class="grid gap-5 sm:grid-cols-2">
          <app-input [label]="'languages.form.name' | t" [required]="true" placeholder="Turkish" formControlName="name"
                     [invalid]="form.controls.name.invalid && form.controls.name.touched" [errorMessage]="'common.validation.name_required' | t" />
          <app-input [label]="'languages.form.native_name' | t" [required]="true" placeholder="Türkçe" formControlName="nativeName"
                     [invalid]="form.controls.nativeName.invalid && form.controls.nativeName.touched" [errorMessage]="'common.validation.name_required' | t" />
        </div>
        <div class="flex flex-col gap-4 rounded-xl border border-line p-4">
          <app-toggle [label]="'common.status.active' | t" [hint]="'languages.form.active_hint' | t" formControlName="isActive" />
          <div class="h-px bg-line"></div>
          <app-toggle [label]="'languages.form.default' | t" [hint]="'languages.form.default_hint' | t" formControlName="isDefault" />
        </div>

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
export class LanguageFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly languageService = inject(LanguageService);
  private readonly i18n = inject(I18nService);

  readonly language = input<LanguageResponseDto | null>(null);
  readonly nextSortOrder = input<number>(1);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[a-z]{2,8}(-[a-z0-9]{2,8})?$/)]],
    name: ['', Validators.required],
    nativeName: ['', Validators.required],
    sortOrder: ['1'],
    // A new language starts switched off: fill in its translations first, then turn it on.
    isActive: [false],
    isDefault: [false]
  });

  ngOnInit(): void {
    const language = this.language();
    if (language) {
      this.form.patchValue({ ...language, sortOrder: String(language.sortOrder) });
      this.form.controls.code.disable();
      if (language.isDefault) {
        this.form.controls.isDefault.disable();
        this.form.controls.isActive.disable();
      }
    } else {
      this.form.patchValue({ sortOrder: String(this.nextSortOrder()) });
    }
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const dto = {
      code: value.code.trim().toLowerCase(),
      name: value.name.trim(),
      nativeName: value.nativeName.trim(),
      sortOrder: Number(value.sortOrder) || 0,
      isActive: value.isActive,
      isDefault: value.isDefault
    };
    const language = this.language();
    const save$ = language ? this.languageService.update(language.code, dto) : this.languageService.create(dto);

    this.saving.set(true);
    this.errorMessage.set('');
    save$.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.save'));
      }
    });
  }
}
