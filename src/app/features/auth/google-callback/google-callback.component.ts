import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  imports: [LogoComponent, TranslatePipe],
  template: `
    <div class="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas">
      <app-logo [size]="56" />
      <div class="flex items-center gap-3 text-espresso-400">
        <span class="h-5 w-5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent"></span>
        {{ 'auth.signing_in' | t }}
      </div>
    </div>
  `
})
export class GoogleCallbackComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    const accessToken = this.route.snapshot.queryParamMap.get('accessToken');
    const refreshToken = this.route.snapshot.queryParamMap.get('refreshToken');

    if (!accessToken || !refreshToken) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.tokenStorage.setTokens(accessToken, refreshToken);
    this.router.navigate([this.authService.homeRoute()]);
  }
}
