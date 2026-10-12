import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AiJsonSchema, AiToolHttpMethod, AiToolRequestDto, AiToolResponseDto } from '../../../core/models/ai.model';
import { DropdownDto } from '../../../core/models/dropdown.model';
import { Role } from '../../../core/models/user.model';
import { AiToolService } from '../../../core/services/ai-tool.service';
import { I18nService } from '../../../core/services/i18n.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SelectComponent } from '../../../shared/components/select/select.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

const METHODS: DropdownDto[] = (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as AiToolHttpMethod[]).map((method) => ({ value: method, label: method }));
const ROLES: { value: Role; label: string }[] = [
  { value: 'CAFE_ADMIN', label: 'role.cafe_admin' },
  { value: 'SUPER_ADMIN', label: 'role.super_admin' }
];
const EMPTY_SCHEMA = JSON.stringify({ type: 'object', properties: {}, required: [] }, null, 2);

@Component({
  selector: 'app-ai-tool-form',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, InputComponent, SelectComponent, ToggleComponent, ButtonComponent, IconComponent, TranslatePipe],
  template: `
    <app-modal size="lg" [title]="(tool() ? 'ai_tools.form.title_edit' : 'ai_tools.form.title_new') | t"
               [subtitle]="'ai_tools.form.subtitle' | t" (closed)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-5 md:grid-cols-2">
        <app-input [label]="'ai_tools.form.name' | t" [required]="true" placeholder="create_product" formControlName="name"
                   [hint]="'ai_tools.form.name_hint' | t"
                   [invalid]="form.controls.name.invalid && form.controls.name.touched" [errorMessage]="'ai_tools.form.name_invalid' | t" />
        <app-input [label]="'ai_tools.form.title' | t" [required]="true" [placeholder]="'ai_tools.form.title_placeholder' | t" formControlName="title"
                   [invalid]="form.controls.title.invalid && form.controls.title.touched" [errorMessage]="'ai_tools.form.title_required' | t" />

        <div class="flex flex-col gap-1.5 md:col-span-2">
          <label for="ai-tool-description" class="text-sm font-medium text-espresso-800">{{ 'ai_tools.form.description' | t }} <span class="text-accent-600">*</span></label>
          <textarea id="ai-tool-description" rows="3" formControlName="description"
                    [placeholder]="'ai_tools.form.description_placeholder' | t"
                    class="rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none"></textarea>
        </div>

        <div class="grid grid-cols-[7rem_1fr] gap-3 md:col-span-2">
          <app-select [label]="'ai_tools.form.method' | t" [options]="methods" formControlName="httpMethod" />
          <app-input [label]="'ai_tools.form.path' | t" [required]="true" placeholder="/api/v1/cafes/{cafeSlug}/products" formControlName="pathTemplate"
                     [hint]="'ai_tools.form.path_hint' | t"
                     [invalid]="form.controls.pathTemplate.invalid && form.controls.pathTemplate.touched" [errorMessage]="'ai_tools.form.path_invalid' | t" />
        </div>

        <div class="flex flex-col gap-1.5 md:col-span-2">
          <div class="flex items-center justify-between">
            <label for="ai-tool-schema" class="text-sm font-medium text-espresso-800">{{ 'ai_tools.form.schema' | t }} <span class="text-accent-600">*</span></label>
            <button type="button" (click)="formatSchema()" class="text-xs font-semibold text-accent-600 hover:text-accent-700">{{ 'ai_tools.form.format' | t }}</button>
          </div>
          <textarea id="ai-tool-schema" rows="12" spellcheck="false" formControlName="inputSchema"
                    class="rounded-xl border bg-surface px-3.5 py-2.5 font-mono text-xs leading-relaxed focus:ring-4 focus:outline-none"
                    [class]="schemaError() ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-line-strong focus:border-accent-500 focus:ring-accent-100'"></textarea>
          @if (schemaError()) {
            <span class="text-xs font-medium text-red-600">{{ schemaError() }}</span>
          } @else {
            <span class="text-xs text-espresso-400">
              {{ 'ai_tools.form.schema_hint' | t }}
            </span>
          }
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium text-espresso-800">{{ 'ai_tools.form.roles' | t }}</span>
          @for (role of roles; track role.value) {
            <label class="flex cursor-pointer items-center gap-2.5 text-sm text-espresso-700">
              <input type="checkbox" class="h-4 w-4 accent-accent-500" [checked]="selectedRoles().includes(role.value)"
                     (change)="toggleRole(role.value)" />
              {{ role.label | t }}
            </label>
          }
          @if (rolesMissing()) {
            <span class="text-xs font-medium text-red-600">{{ 'ai_tools.form.roles_required' | t }}</span>
          }
        </div>

        <div class="flex flex-col gap-4 rounded-xl border border-line p-4">
          <app-toggle [label]="'ai_tools.form.requires_confirmation' | t" [hint]="'ai_tools.form.requires_confirmation_hint' | t"
                      formControlName="requiresConfirmation" />
          <div class="h-px bg-line"></div>
          <app-toggle [label]="'common.status.active' | t" formControlName="active" />
        </div>

        @if (errorMessage()) {
          <div class="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700 md:col-span-2">
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
export class AiToolFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly toolService = inject(AiToolService);
  private readonly i18n = inject(I18nService);

  readonly tool = input<AiToolResponseDto | null>(null);
  readonly saved = output<AiToolResponseDto>();
  readonly cancelled = output<void>();

  protected readonly methods = METHODS;
  protected readonly roles = ROLES;
  protected readonly selectedRoles = signal<Role[]>(['CAFE_ADMIN', 'SUPER_ADMIN']);
  protected readonly rolesMissing = signal(false);
  protected readonly schemaError = signal('');
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]{1,64}$/)]],
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    httpMethod: ['GET' as AiToolHttpMethod, Validators.required],
    pathTemplate: ['/api/v1/', [Validators.required, Validators.pattern(/^\/api\/v1\/.*/)]],
    inputSchema: [EMPTY_SCHEMA, Validators.required],
    requiresConfirmation: [false],
    active: [true]
  });

  ngOnInit(): void {
    const tool = this.tool();
    if (tool) {
      this.form.patchValue({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        httpMethod: tool.httpMethod,
        pathTemplate: tool.pathTemplate,
        inputSchema: JSON.stringify(tool.inputSchema, null, 2),
        requiresConfirmation: tool.requiresConfirmation,
        active: tool.active
      });
      this.selectedRoles.set([...tool.allowedRoles]);
    }
  }

  protected toggleRole(role: Role): void {
    this.selectedRoles.update((roles) => roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role]);
    this.rolesMissing.set(false);
  }

  protected formatSchema(): void {
    const schema = this.parseSchema();
    if (schema) {
      this.form.controls.inputSchema.setValue(JSON.stringify(schema, null, 2));
    }
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    this.form.markAllAsTouched();
    const schema = this.parseSchema();
    this.rolesMissing.set(this.selectedRoles().length === 0);
    if (this.form.invalid || !schema || this.rolesMissing()) {
      return;
    }
    const value = this.form.getRawValue();
    const dto: AiToolRequestDto = {
      name: value.name.trim(),
      title: value.title.trim(),
      description: value.description.trim(),
      httpMethod: value.httpMethod,
      pathTemplate: value.pathTemplate.trim(),
      inputSchema: schema,
      requiresConfirmation: value.requiresConfirmation,
      allowedRoles: this.selectedRoles(),
      active: value.active
    };
    const tool = this.tool();
    this.saving.set(true);
    this.errorMessage.set('');
    (tool ? this.toolService.update(tool.name, dto) : this.toolService.create(dto)).subscribe({
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

  private parseSchema(): AiJsonSchema | null {
    try {
      const schema = JSON.parse(this.form.controls.inputSchema.value) as AiJsonSchema;
      if (!schema || typeof schema !== 'object' || Array.isArray(schema) || schema.type !== 'object') {
        this.schemaError.set(this.i18n.t('ai_tools.form.schema_not_object'));
        return null;
      }
      this.schemaError.set('');
      return schema;
    } catch (error) {
      this.schemaError.set(this.i18n.t('ai_tools.form.schema_json_error', { error: (error as Error).message }));
      return null;
    }
  }
}
