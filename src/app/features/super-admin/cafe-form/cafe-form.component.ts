import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CafeEditorComponent } from '../../cafes/cafe-editor/cafe-editor.component';

@Component({
  selector: 'app-cafe-form',
  standalone: true,
  imports: [CafeEditorComponent],
  template: `<app-cafe-editor [slug]="slug" [canAssignOwner]="true" returnLink="/super-admin/cafes" />`
})
export class CafeFormComponent {

  protected readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug');
}
