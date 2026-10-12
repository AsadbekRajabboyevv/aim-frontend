import { Component, computed, input, signal } from '@angular/core';
import { mediaUrl } from '../../../core/utils/media-url.util';

const TONES = [
  'bg-accent-100 text-accent-700',
  'bg-espresso-100 text-espresso-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700'
];

@Component({
  selector: 'app-avatar',
  standalone: true,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <span
      [class]="classes()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.font-size.px]="size() * 0.38"
    >
      @if (resolvedUrl() && !imageFailed()) {
        <img [src]="resolvedUrl()" alt="" class="h-full w-full object-cover" (error)="imageFailed.set(true)" />
      } @else {
        {{ initials() }}
      }
    </span>
  `
})
export class AvatarComponent {

  readonly name = input<string>('');
  readonly imageUrl = input<string | null>(null);
  readonly size = input<number>(36);
  readonly shape = input<'circle' | 'rounded'>('circle');

  protected readonly imageFailed = signal(false);
  protected readonly resolvedUrl = computed(() => mediaUrl(this.imageUrl()));

  protected readonly initials = computed(() => {
    const parts = this.name().replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2);
    return letters.toUpperCase();
  });

  protected readonly classes = computed(() => {
    const hash = [...this.name()].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return [
      'flex items-center justify-center overflow-hidden font-semibold select-none',
      this.shape() === 'circle' ? 'rounded-full' : 'rounded-xl',
      TONES[hash % TONES.length]
    ].join(' ');
  });
}
