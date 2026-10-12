import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QrPrintComponent } from '../../cafes/qr-print/qr-print.component';

@Component({
  selector: 'app-admin-cafe-qr',
  standalone: true,
  imports: [QrPrintComponent],
  template: `<app-qr-print [cafeSlug]="slug" returnLink="/super-admin/cafes" />`
})
export class AdminCafeQrComponent {

  protected readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug') ?? '';
}
