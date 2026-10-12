export interface JwtUserClaims {
  sub: string;
  slug: string;
  email: string;
  role: string;
  type: string;
  exp: number;
}

export function decodeJwtPayload(token: string): JwtUserClaims | null {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json) as JwtUserClaims;
  } catch {
    return null;
  }
}

export function isTokenExpired(claims: JwtUserClaims | null): boolean {
  if (!claims) {
    return true;
  }
  return claims.exp * 1000 <= Date.now();
}
