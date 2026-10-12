import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MenuManagerComponent } from '../../cafes/menu-manager/menu-manager.component';

@Component({
  selector: 'app-cafe-menu',
  standalone: true,
  imports: [MenuManagerComponent],
  template: `<app-menu-manager [cafeSlug]="slug" returnLink="/cafe-admin/cafes" />`
})
export class CafeMenuComponent {

  protected readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug') ?? '';
}
