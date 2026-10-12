import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DropdownDto } from '../../../core/models/dropdown.model';
import { SettingResponseDto, SettingType } from '../../../core/models/setting.model';
import { I18nService } from '../../../core/services/i18n.service';
import { SettingService } from '../../../core/services/setting.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SelectComponent } from '../../../shared/components/select/select.component';
import { TextareaComponent } from '../../../shared/components/textarea/textarea.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

const KEY_PATTERN = /^[a-z0-9]+([._][a-z0-9]+)*$/;


@Component({
  selector: 'app-setting-form',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, InputComponent, SelectComponent, TextareaComponent, ButtonComponent, IconComponent, TranslatePipe],
  template: `
    <app-modal [title]="(setting() ? 'settings.form.title_edit' : 'settings.new') | t"
               [subtitle]="setting()?.key ?? ('settings.form.key_locked_later' | t)" (closed)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
        @if (!setting()) {
          <app-input [label]="'settings.form.key' | t" [required]="true" placeholder="menu.refresh_minutes" formControlName="key"
                     [hint]="'settings.form.key_hint' | t"
                     [invalid]="form.controls.key.invalid && form.controls.key.touched"
                     [errorMessage]="'settings.form.key_invalid' | t" />
        }
        <app-select [label]="'settings.form.type' | t" [options]="typeOptions()" formControlName="type"
                    [hint]="setting()?.protectedKey ? ('settings.form.type_locked' | t) : ''" />

        @switch (form.controls.type.value) {
          @case ('BOOLEAN') {
            <app-select [label]="'settings.form.value' | t" [options]="booleanOptions()" formControlName="value" />
          }
          @case ('INTEGER') {
            <app-input [label]="'settings.form.value' | t" type="number" [required]="true" formControlName="value"
                       [invalid]="valueInvalid()" [errorMessage]="'settings.form.integer_required' | t" />
          }
          @default {
            <app-input [label]="'settings.form.value' | t" [required]="true" formControlName="value"
                       [invalid]="valueInvalid()" [errorMessage]="'settings.form.value_required' | t" />
          }
        }

        <app-textarea [label]="'common.description' | t" [rows]="2" [placeholder]="'settings.form.description_placeholder' | t" formControlName="description" />

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
export class SettingFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly settingService = inject(SettingService);
  private readonly i18n = inject(I18nService);

  readonly setting = input<SettingResponseDto | null>(null);

  readonly saved = output<SettingResponseDto>();
  readonly cancelled = output<void>();

  protected readonly typeOptions = computed<DropdownDto[]>(() => [
    { value: 'STRING', label: this.i18n.t('settings.type.STRING') },
    { value: 'INTEGER', label: this.i18n.t('settings.type.INTEGER') },
    { value: 'BOOLEAN', label: this.i18n.t('settings.type.BOOLEAN') }
  ]);
  protected readonly booleanOptions = computed<DropdownDto[]>(() => [
    { value: 'true', label: this.i18n.t('settings.boolean.true') },
    { value: 'false', label: this.i18n.t('settings.boolean.false') }
  ]);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  private readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    key: ['', [Validators.required, Validators.pattern(KEY_PATTERN), Validators.maxLength(150)]],
    type: this.fb.nonNullable.control<SettingType>('STRING'),
    value: ['', [Validators.required, Validators.maxLength(1000)]],
    description: ['', Validators.maxLength(500)]
  });

  protected readonly valueInvalid = computed(() => this.submitted() && this.form.controls.value.invalid);

  ngOnInit(): void {
    const setting = this.setting();
    if (setting) {
      this.form.patchValue({ key: setting.key, type: setting.type, value: setting.value, description: setting.description ?? '' });
      this.form.controls.key.disable();
      if (setting.protectedKey) {
        this.form.controls.type.disable();
      }
    }
    this.form.controls.type.valueChanges.subscribe((type) => {
      const value = this.form.controls.value;
      value.setValidators(type === 'INTEGER'
        ? [Validators.required, Validators.pattern(/^-?\d{1,9}$/)]
        : [Validators.required, Validators.maxLength(1000)]);
      if (type === 'BOOLEAN' && !['true', 'false'].includes(value.value)) {
        value.setValue('true');
      }
      value.updateValueAndValidity();
    });
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const setting = this.setting();
    const save$ = setting
      ? this.settingService.update(setting.key, { value: String(value.value), type: value.type, description: value.description || null })
      : this.settingService.create({ key: value.key.trim(), value: String(value.value), type: value.type, description: value.description || null });

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
        this.errorMessage.set([error?.error?.message, ...(error?.error?.errors ?? [])].filter(Boolean).join(' — ') || this.i18n.t('common.error.save'));
      }
    });
  }
}
