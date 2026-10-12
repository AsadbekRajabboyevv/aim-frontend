import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CafeEditorComponent } from '../../cafes/cafe-editor/cafe-editor.component';

@Component({
  selector: 'app-my-cafe',
  standalone: true,
  imports: [CafeEditorComponent],
  template: `<app-cafe-editor [slug]="slug" returnLink="/cafe-admin/cafes" />`
})
export class MyCafeComponent {

  protected readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug');
}
