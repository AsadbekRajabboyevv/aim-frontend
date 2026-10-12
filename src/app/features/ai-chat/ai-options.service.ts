import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { SERVER_BASE_URL } from '../../core/constants/api.constants';
import { AiSchemaOptionsSource } from '../../core/models/ai.model';

export interface AiOption {
  value: string;
  label: string;
}

export function readPath(source: unknown, dotPath: string): unknown {
  return dotPath.split('.').reduce<unknown>((node, key) =>
    node !== null && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined, source);
}

@Injectable({ providedIn: 'root' })
export class AiOptionsService {

  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<AiOption[]>>();

  resolvePath(source: AiSchemaOptionsSource, values: Record<string, unknown>): string | null {
    let unresolved = false;
    const path = source.path.replace(/\{(\w+)}/g, (_, name: string) => {
      const value = values[name];
      if (value === undefined || value === null || String(value).trim() === '') {
        unresolved = true;
        return '';
      }
      return encodeURIComponent(String(value));
    });
    return unresolved || !path.startsWith('/api/v1/') ? null : path;
  }

  load(source: AiSchemaOptionsSource, path: string): Observable<AiOption[]> {
    const key = `${path}|${source.items ?? 'data'}|${source.value}|${source.label}`;
    let request = this.cache.get(key);
    if (!request) {
      request = this.http.get<unknown>(SERVER_BASE_URL + path).pipe(
        map((response) => {
          const items = readPath(response, source.items ?? 'data');
          return Array.isArray(items)
            ? items.map((item) => ({
              value: String(readPath(item, source.value) ?? ''),
              label: String(readPath(item, source.label) ?? readPath(item, source.value) ?? '')
            })).filter((option) => option.value)
            : [];
        }),
        catchError(() => of([] as AiOption[])),
        shareReplay(1)
      );
      this.cache.set(key, request);
    }
    return request;
  }
}
