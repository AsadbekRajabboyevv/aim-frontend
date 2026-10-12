import { Component, computed, input, output, signal } from '@angular/core';
import { mediaUrl } from '../../../core/utils/media-url.util';
import { IconComponent } from '../icon/icon.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [IconComponent, TranslatePipe],
  template: `
    <div class="flex flex-col gap-1.5">
      @if (label()) {
        <span class="text-sm font-medium text-espresso-800">{{ label() }}</span>
      }

      <label
        class="group flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-line-strong bg-surface
               p-3 transition hover:border-accent-500 hover:bg-accent-50/40"
      >
        <div [class]="previewClasses()">
          @if (previewUrl(); as url) {
            <img [src]="url" alt="" class="h-full w-full object-cover" />
          } @else {
            <app-icon name="image" [size]="22" class="text-espresso-300" />
          }
        </div>
        <div class="flex min-w-0 flex-col">
          <span class="flex items-center gap-1.5 text-sm font-semibold text-espresso-800 group-hover:text-accent-600">
            <app-icon name="upload" [size]="16" />
            {{ (previewUrl() ? 'upload.replace_image' : 'upload.upload_image') | t }}
          </span>
          <span class="truncate text-xs text-espresso-400">{{ fileName() || hint() || ('upload.hint' | t) }}</span>
        </div>
        <input type="file" [accept]="accept()" class="hidden" (change)="onFileSelected($event)" />
      </label>
    </div>
  `
})
export class FileUploadComponent {

  readonly label = input<string>('');
  /** Defaults to the common "PNG or JPG, up to 5 MB" text. */
  readonly hint = input<string>('');
  readonly accept = input<string>('image/*');
  readonly existingUrl = input<string | null>(null);
  readonly shape = input<'square' | 'wide'>('square');

  readonly fileSelected = output<File>();

  protected readonly localPreview = signal<string | null>(null);
  protected readonly fileName = signal('');

  protected readonly previewClasses = computed(() => [
    'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-espresso-50',
    this.shape() === 'wide' ? 'h-16 w-28' : 'h-16 w-16'
  ].join(' '));

  protected previewUrl(): string | null {
    return this.localPreview() ?? mediaUrl(this.existingUrl());
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.localPreview.set(URL.createObjectURL(file));
    this.fileName.set(file.name);
    this.fileSelected.emit(file);
  }
}
