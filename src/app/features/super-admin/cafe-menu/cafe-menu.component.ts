import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MenuManagerComponent } from '../../cafes/menu-manager/menu-manager.component';

@Component({
  selector: 'app-admin-cafe-menu',
  standalone: true,
  imports: [MenuManagerComponent],
  template: `<app-menu-manager [cafeSlug]="slug" returnLink="/super-admin/cafes" />`
})
export class AdminCafeMenuComponent {

  protected readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug') ?? '';
}
