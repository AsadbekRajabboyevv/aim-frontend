import { signal } from '@angular/core';

/** Seconds left until a new code may be requested; call {@link stop} when the page is destroyed. */
export class ResendCountdown {

  readonly seconds = signal(0);

  private timer: ReturnType<typeof setInterval> | null = null;

  start(seconds: number): void {
    this.stop();
    this.seconds.set(Math.max(0, Math.ceil(seconds)));
    if (this.seconds() === 0) {
      return;
    }
    this.timer = setInterval(() => {
      this.seconds.update((value) => value - 1);
      if (this.seconds() <= 0) {
        this.stop();
      }
    }, 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

/** Navigation state the pages sending a code pass along with ?email=. */
export interface CodeSentNavigationState {
  resendIn?: number;
}
