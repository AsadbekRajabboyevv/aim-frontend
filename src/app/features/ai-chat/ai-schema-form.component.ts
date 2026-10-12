import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { AiJsonSchema, AiSchemaOptionsSource } from '../../core/models/ai.model';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AiOptionsService, readPath } from './ai-options.service';
import { isEmptyValue as isEmpty, missingRequired } from './ai-schema.util';

type FieldKind = 'object' | 'options' | 'enum' | 'multi-enum' | 'boolean' | 'number' | 'datetime' | 'textarea' | 'text';

function toLocalInput(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface Field {
  key: string;
  path: string[];
  schema: AiJsonSchema;
  required: boolean;
  kind: FieldKind;
}

interface OptionsState {
  loading: boolean;
  options: { value: string; label: string }[];
  waiting: boolean;
}

function prune(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => [key, prune(child)] as const)
      .filter(([, child]) => !isEmpty(child) && !(typeof child === 'object' && !Array.isArray(child) && Object.keys(child as object).length === 0));
    return Object.fromEntries(entries);
  }
  return typeof value === 'string' ? value.trim() : value;
}

@Component({
  selector: 'app-ai-schema-form',
  standalone: true,
  imports: [NgTemplateOutlet, ButtonComponent, IconComponent, TranslatePipe],
  template: `
    <form (submit)="$event.preventDefault(); submit()" class="flex flex-col gap-4">
      @for (field of fieldsOf(schema(), []); track field.key) {
        <ng-container *ngTemplateOutlet="fieldTpl; context: { $implicit: field }" />
      }

      @if (submitted() && missing().length) {
        <p class="flex items-center gap-1.5 text-sm font-medium text-red-600">
          <app-icon name="alert" [size]="16" />
          {{ 'ai_chat.form.fill_required' | t }}
        </p>
      }

      <div class="flex flex-wrap justify-end gap-2 pt-1">
        <app-button variant="secondary" size="sm" [disabled]="busy()" (clicked)="cancelled.emit()">{{ 'common.cancel' | t }}</app-button>
        <app-button type="submit" size="sm" icon="check" [loading]="busy()">{{ 'ai_chat.action.confirm' | t }}</app-button>
      </div>
    </form>

    <ng-template #fieldTpl let-field>
      @switch (field.kind) {
        @case ('object') {
          <fieldset class="flex flex-col gap-3 rounded-xl border border-line p-3">
            <legend class="px-1 text-sm font-semibold text-espresso-800">
              {{ label(field) }}@if (field.required) {<span class="text-accent-600"> *</span>}
            </legend>
            @for (child of fieldsOf(field.schema, field.path); track child.key) {
              <ng-container *ngTemplateOutlet="fieldTpl; context: { $implicit: child }" />
            }
          </fieldset>
        }
        @case ('boolean') {
          <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
            <span class="text-sm font-medium text-espresso-800">{{ label(field) }}</span>
            <input type="checkbox" class="h-5 w-5 accent-accent-500" [checked]="value(field) === true"
                   (change)="set(field.path, $any($event.target).checked)" />
          </label>
        }
        @case ('multi-enum') {
          <div class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-espresso-800">{{ label(field) }}</span>
            <div class="flex flex-wrap gap-2">
              @for (option of field.schema.items?.enum ?? []; track option) {
                @let on = selectedList(field).includes(option);
                <button type="button" (click)="toggleInList(field, option)" [attr.aria-pressed]="on"
                        class="h-8 rounded-full px-3 text-sm font-semibold ring-1 transition"
                        [class]="on ? 'bg-accent-500 text-white ring-transparent' : 'bg-surface text-espresso-600 ring-line-strong hover:bg-espresso-50'">
                  {{ enumLabel(field.schema, option) }}
                </button>
              }
            </div>
          </div>
        }
        @default {
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-espresso-800" [attr.for]="inputId(field)">
              {{ label(field) }}@if (field.required) {<span class="text-accent-600"> *</span>}
            </label>
            @switch (field.kind) {
              @case ('options') {
                @let state = options()[field.path.join('.')];
                @if (state && !state.loading && state.options.length === 0 && !state.waiting) {
                  <input [id]="inputId(field)" type="text" [value]="text(field)" (input)="set(field.path, $any($event.target).value)"
                         [class]="inputClasses(field)" />
                } @else {
                  <select [id]="inputId(field)" (change)="set(field.path, $any($event.target).value || null)" [class]="inputClasses(field)"
                          [disabled]="!state || state.loading || state.waiting">
                    <option value="">{{ (state?.loading ? 'common.loading' : state?.waiting ? 'ai_chat.form.select_above_first' : 'common.select') | t }}</option>
                    @for (option of state?.options ?? []; track option.value) {
                      <option [value]="option.value" [selected]="option.value === value(field)">{{ option.label }}</option>
                    }
                  </select>
                }
              }
              @case ('enum') {
                <select [id]="inputId(field)" (change)="set(field.path, $any($event.target).value || null)" [class]="inputClasses(field)">
                  <option value="">{{ 'common.select' | t }}</option>
                  @for (option of field.schema.enum ?? []; track option) {
                    <option [value]="option" [selected]="option === value(field)">{{ enumLabel(field.schema, option) }}</option>
                  }
                </select>
              }
              @case ('number') {
                <input [id]="inputId(field)" type="number" inputmode="decimal" [value]="text(field)"
                       [attr.min]="field.schema.minimum ?? null" [attr.max]="field.schema.maximum ?? null"
                       (input)="setNumber(field.path, $any($event.target).value)" [class]="inputClasses(field)" />
              }
              @case ('datetime') {
                <input [id]="inputId(field)" type="datetime-local" [value]="localDateTime(field)"
                       (input)="setDateTime(field.path, $any($event.target).value)" [class]="inputClasses(field)" />
              }
              @case ('textarea') {
                <textarea [id]="inputId(field)" rows="3" [value]="text(field)" (input)="set(field.path, $any($event.target).value)"
                          [class]="inputClasses(field) + ' h-auto py-2.5'"></textarea>
              }
              @default {
                <input [id]="inputId(field)" type="text" [value]="text(field)" [attr.maxlength]="field.schema.maxLength ?? null"
                       (input)="set(field.path, $any($event.target).value)" [class]="inputClasses(field)" />
              }
            }
            @if (hint(field); as hint) {
              <span class="text-xs text-espresso-400">{{ hint }}</span>
            }
          </div>
        }
      }
    </ng-template>
  `
})
export class AiSchemaFormComponent implements OnInit {

  private readonly optionsService = inject(AiOptionsService);

  readonly schema = input.required<AiJsonSchema>();
  readonly initialValues = input<Record<string, unknown> | null>(null);
  readonly formId = input<string>('ai-form');
  readonly busy = input<boolean>(false);

  readonly confirmed = output<Record<string, unknown>>();
  readonly cancelled = output<void>();

  protected readonly values = signal<Record<string, unknown>>({});
  protected readonly submitted = signal(false);
  protected readonly options = signal<Record<string, OptionsState>>({});
  private readonly loadedUrls = new Map<string, string>();

  protected readonly missing = computed(() => missingRequired(this.schema(), this.values()));

  ngOnInit(): void {
    const initial = structuredClone(this.initialValues() ?? {});
    this.applyDefaults(this.schema(), initial);
    this.values.set(initial);
    this.refreshOptions();
  }

  protected fieldsOf(schema: AiJsonSchema, parent: string[]): Field[] {
    const required = new Set(schema.required ?? []);
    return Object.entries(schema.properties ?? {}).map(([key, prop]) => ({
      key,
      path: [...parent, key],
      schema: prop,
      required: required.has(key),
      kind: this.kindOf(prop)
    }));
  }

  protected label(field: Field): string {
    return field.schema.title || field.key;
  }

  protected hint(field: Field): string {
    return field.schema['x-hint'] ?? (field.schema.title ? '' : field.schema.description ?? '');
  }

  protected enumLabel(schema: AiJsonSchema, value: string): string {
    return schema['x-enum-labels']?.[value] ?? value;
  }

  protected inputId(field: Field): string {
    return `${this.formId()}-${field.path.join('-')}`;
  }

  protected value(field: Field): unknown {
    return readPath(this.values(), field.path.join('.'));
  }

  protected text(field: Field): string {
    const value = this.value(field);
    return value === undefined || value === null ? '' : String(value);
  }

  protected selectedList(field: Field): string[] {
    const value = this.value(field);
    return Array.isArray(value) ? (value as string[]) : [];
  }

  protected inputClasses(field: Field): string {
    const invalid = this.submitted() && this.missing().includes(field.path.join('.'));
    return [
      'h-10 w-full rounded-xl border bg-surface px-3 text-sm text-espresso-900 transition focus:outline-none focus:ring-4',
      'disabled:bg-espresso-50 disabled:text-espresso-400',
      invalid ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-line-strong focus:border-accent-500 focus:ring-accent-100'
    ].join(' ');
  }

  protected set(path: string[], value: unknown): void {
    const next = structuredClone(this.values());
    let node: Record<string, unknown> = next;
    for (const key of path.slice(0, -1)) {
      if (node[key] === null || typeof node[key] !== 'object') {
        node[key] = {};
      }
      node = node[key] as Record<string, unknown>;
    }
    node[path[path.length - 1]] = value;
    this.values.set(next);
    if (path.length === 1) {
      this.refreshOptions();
    }
  }

  protected setNumber(path: string[], raw: string): void {
    this.set(path, raw === '' ? null : Number(raw));
  }

  protected localDateTime(field: Field): string {
    return toLocalInput(this.value(field));
  }

  protected setDateTime(path: string[], local: string): void {
    this.set(path, local ? new Date(local).toISOString() : null);
  }

  protected toggleInList(field: Field, option: string): void {
    const current = this.selectedList(field);
    const order = field.schema.items?.enum ?? [];
    const next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
    this.set(field.path, order.filter((item) => next.includes(item)));
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.missing().length === 0) {
      this.confirmed.emit(prune(this.values()) as Record<string, unknown>);
    }
  }

  private kindOf(schema: AiJsonSchema): FieldKind {
    if (schema.type === 'object' && schema.properties) {
      return 'object';
    }
    if (schema['x-options']) {
      return 'options';
    }
    if (schema.type === 'array' && schema.items?.enum) {
      return 'multi-enum';
    }
    if (schema.enum) {
      return 'enum';
    }
    if (schema.type === 'boolean') {
      return 'boolean';
    }
    if (schema.type === 'number' || schema.type === 'integer') {
      return 'number';
    }
    if (schema.format === 'date-time') {
      return 'datetime';
    }
    return schema['x-multiline'] ? 'textarea' : 'text';
  }

  private applyDefaults(schema: AiJsonSchema, target: Record<string, unknown>): void {
    for (const [key, prop] of Object.entries(schema.properties ?? {})) {
      if (prop.type === 'object' && prop.properties) {
        const child = (target[key] ?? {}) as Record<string, unknown>;
        this.applyDefaults(prop, child);
        target[key] = child;
      } else if (target[key] === undefined && prop.default !== undefined) {
        target[key] = structuredClone(prop.default);
      }
    }
  }

  private refreshOptions(): void {
    const visit = (schema: AiJsonSchema, parent: string[]) => {
      for (const field of this.fieldsOf(schema, parent)) {
        if (field.kind === 'object') {
          visit(field.schema, field.path);
        } else if (field.kind === 'options') {
          this.loadOptions(field.path.join('.'), field.schema['x-options']!);
        }
      }
    };
    visit(this.schema(), []);
  }

  private loadOptions(key: string, source: AiSchemaOptionsSource): void {
    const path = this.optionsService.resolvePath(source, this.values());
    if (!path) {
      this.loadedUrls.delete(key);
      this.patchOptions(key, { loading: false, options: [], waiting: source.path.includes('{') });
      return;
    }
    if (this.loadedUrls.get(key) === path) {
      return;
    }
    this.loadedUrls.set(key, path);
    this.patchOptions(key, { loading: true, options: [], waiting: false });
    this.optionsService.load(source, path)
      .subscribe((options) => this.patchOptions(key, { loading: false, options, waiting: false }));
  }

  private patchOptions(key: string, state: OptionsState): void {
    this.options.update((all) => ({ ...all, [key]: state }));
  }
}
