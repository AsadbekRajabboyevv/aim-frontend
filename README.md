# AIM — Frontend

Onlayn menyu platformasining veb-ilovasi: kafe egalari va super admin uchun boshqaruv paneli hamda
mijozlar planshetda ko'radigan ochiq menyu.

## Texnologiyalar

- Angular 21 (standalone komponentlar, signals)
- Tailwind CSS 4
- TypeScript 5.9
- Vitest (unit testlar)

## Talablar

- Node.js 22+
- npm 11
- Ishlab turgan [backend](../backend/README.md) (`http://localhost:8080`)

## O'rnatish va ishga tushirish

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

Ilova `http://localhost:4200` da ochiladi va fayllar o'zgarganda avtomatik yangilanadi.

> `--legacy-peer-deps` npm'ning Angular CLI test runner (vitest) peer-bog'liqliklaridagi xatosini
> chetlab o'tish uchun kerak (`Cannot read properties of null (reading 'edgesOut')`).

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm start` | Dev server (`ng serve`) |
| `npm run build` | Production build → `dist/` |
| `npm run watch` | Development build, o'zgarishlarni kuzatib boradi |
| `npm test` | Unit testlar (Vitest) |

## Backend manzili

API manzili `src/app/core/constants/api.constants.ts` da:

```ts
export const SERVER_BASE_URL = 'http://localhost:8080';
```

Boshqa serverga ulash uchun shu qiymatni o'zgartiring. Backend'dagi `CORS_ALLOWED_ORIGINS` frontend
manzilini o'z ichiga olishi kerak.

## Sahifalar

**Ochiq (kirishsiz)**
- `/` — landing sahifa (imkoniyatlar, jonli demo, tariflar `public/billing/plans` dan, savollar)
- `/terms`, `/privacy` — foydalanish shartlari va maxfiylik siyosati; matni super admin panelidagi «Huquqiy hujjatlar» sahifasida tahrirlanadi
- `/auth/login`, `/auth/register` — kirish va ro'yxatdan o'tish (email yoki Google)
- `/menu/:cafeSlug` — mijozlar uchun planshet menyusi. `?table=N` parametri stol raqamini
  bildiradi (QR kodlar shu manzilni ochadi). Menyu har 5 daqiqada o'zi yangilanadi.

**Super admin** (`/super-admin/...`)
- Kafelar: yaratish, tahrirlash, menyu, QR stikerlar, stop-list
- Chegirmalar, tillar, tizim xabarlari, sozlamalar
- Foydalanilmayotgan fayllarni tozalash
- AI vositalari va AI sozlamalari
- Tariflar: narxlar, limitlar (AI cheklovlari ham), obunalar, to'lovlar, to'lov tizimlari

**Kafe admin** (`/cafe-admin/...`)
- O'z kafelari, menyusi, QR stikerlari, stop-list va chegirmalari
- `/billing` — joriy tarif, limitlardan foydalanish, tarif sotib olish (Payme / Click / Uzum), to'lovlar tarixi.
  Limit to'lsa yoki sinov tugasa, panel tepasida taklif chiqadi; API 402 qaytarsa, upgrade oynasi ochiladi

**Barcha foydalanuvchilar**
- `/profile` — shaxsiy ma'lumotlar va parol
- `/ai-chat` — AI yordamchi bilan suhbat

## Loyiha tuzilishi

```
src/app/
  core/
    constants/     API manzili, rollar, localStorage kalitlari
    guards/        Autentifikatsiya va rol tekshiruvi
    interceptors/  JWT qo'shish, 401 da tokenni yangilash, X-Lang headeri
    models/        Backend DTO'lari bilan bir xil interfeyslar
    services/      Backend bilan ishlovchi servislar
    utils/         Menyu temalari va yordamchi funksiyalar
  shared/
    components/    Qayta ishlatiladigan komponentlar (input, select, jadval, fayl yuklash, logo...)
  layout/          Yon menyu va sahifa qobig'i
  features/        Sahifalar (landing, auth, cafes, cafe-admin, super-admin, discounts, ai-chat, public-menu, profile)
```

- `core/models` dagi interfeyslar backend'dagi `*RequestDto` / `*ResponseDto` / `*Filter` bilan
  birma-bir mos keladi.
- Forma komponentlari `ControlValueAccessor` asosida yozilgan va Reactive Forms bilan to'g'ridan-to'g'ri
  ishlaydi.

## Dizayn

- Ranglar `src/styles.css` dagi `@theme` blokida: `accent-*` — brend qizil rangi, `espresso-*` —
  to'q neytral ranglar.
- Logo: `public/logo.png`, favicon: `public/favicon.png`. Ilova ichida `<app-logo>` komponenti
  orqali ishlatiladi (`[dark]="true"` — qorong'i fon uchun).
- Planshet menyusining temalari (Espresso, Zaytun, Za'faron) har bir kafe uchun alohida tanlanadi:
  `core/utils/menu-theme.util.ts`.

## Google orqali kirish

Login sahifasidagi tugma backend'dagi `/oauth2/authorization/google` ga yo'naltiradi. Muvaffaqiyatli
kirishdan keyin backend `/auth/google/callback` sahifasiga tokenlar bilan qaytaradi va
`GoogleCallbackComponent` ularni saqlaydi. Yangi email bilan birinchi marta kirilganda kafe admin
hisobi avtomatik yaratiladi.
