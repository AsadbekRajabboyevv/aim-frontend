import { MenuTheme } from '../models/cafe.model';

interface ThemePalette {
  label: string;
  espresso: Record<50 | 100 | 300 | 400 | 500 | 700 | 800 | 900 | 950, string>;
  accent: Record<50 | 100 | 200 | 500 | 600 | 700, string>;
  canvas: string;
  line: string;
  lineStrong: string;
}

const PALETTES: Record<MenuTheme, ThemePalette> = {
  ESPRESSO: {
    label: 'Espresso',
    espresso: { 50: '#f7f2ee', 100: '#ebe0d6', 300: '#b9a18d', 400: '#8f7560', 500: '#6b5444', 700: '#3d2a1e', 800: '#33241a', 900: '#2b1d14', 950: '#1f150e' },
    accent: { 50: '#fdf3ec', 100: '#fbe3d2', 200: '#f6c7a4', 500: '#e8772e', 600: '#d9621c', 700: '#b54f16' },
    canvas: '#faf7f2', line: '#ede6dc', lineStrong: '#dfd5c7'
  },
  OLIVE: {
    label: 'Zaytun',
    espresso: { 50: '#f2f5ee', 100: '#e1e8d8', 300: '#a7b594', 400: '#7d8c69', 500: '#5c6b4b', 700: '#34402a', 800: '#2a3522', 900: '#1f2a19', 950: '#161e12' },
    accent: { 50: '#f4f8ea', 100: '#e5efcc', 200: '#cddfa0', 500: '#7fa33a', 600: '#6a8b2c', 700: '#536d22' },
    canvas: '#f7f8f2', line: '#e3e7da', lineStrong: '#d3d9c5'
  },
  OCEAN: {
    label: 'Dengiz',
    espresso: { 50: '#eef4f8', 100: '#d8e6ef', 300: '#93b2c6', 400: '#6a8ea6', 500: '#4d6f86', 700: '#26435a', 800: '#1c3549', 900: '#13283a', 950: '#0c1c2a' },
    accent: { 50: '#e9f6fb', 100: '#c9e9f5', 200: '#97d4ec', 500: '#1f9bcf', 600: '#1683b1', 700: '#12698e' },
    canvas: '#f5f8fa', line: '#e0e8ee', lineStrong: '#cfdbe4'
  },
  BURGUNDY: {
    label: 'Vino',
    espresso: { 50: '#f8f0f1', 100: '#efdadd', 300: '#c89aa2', 400: '#a8707b', 500: '#87515c', 700: '#562a33', 800: '#45202a', 900: '#34161e', 950: '#240e14' },
    accent: { 50: '#fdf0f1', 100: '#f9d9dd', 200: '#f1b0b9', 500: '#c8374f', 600: '#ad2a41', 700: '#8e2135' },
    canvas: '#faf6f5', line: '#eee2e1', lineStrong: '#e2d1cf'
  },
  MIDNIGHT: {
    label: 'Tun va oltin',
    espresso: { 50: '#f1f2f5', 100: '#dfe1e8', 300: '#9ea3b3', 400: '#767c90', 500: '#595f72', 700: '#2f3342', 800: '#242735', 900: '#181a24', 950: '#0f1017' },
    accent: { 50: '#fcf7ea', 100: '#f6e9c6', 200: '#edd38e', 500: '#c99a2e', 600: '#ad8124', 700: '#8b671d' },
    canvas: '#f6f6f4', line: '#e5e4df', lineStrong: '#d6d4cd'
  },
  SAFFRON: {
    label: "Za'faron",
    espresso: { 50: '#fbf5ec', 100: '#f3e5cc', 300: '#d6b27a', 400: '#b98d4f', 500: '#946b35', 700: '#5c3f1b', 800: '#4a3215', 900: '#3a2610', 950: '#291a0a' },
    accent: { 50: '#fff8e6', 100: '#feecbd', 200: '#fcd87a', 500: '#eaa90f', 600: '#c98f0a', 700: '#a2720b' },
    canvas: '#fcf9f2', line: '#efe6d3', lineStrong: '#e3d6ba'
  }
};

export const DEFAULT_MENU_THEME: MenuTheme = 'ESPRESSO';

export interface ThemeOption {
  value: MenuTheme;
  label: string;
  rail: string;
  accent: string;
  canvas: string;
}

export const THEME_OPTIONS: ThemeOption[] = (Object.keys(PALETTES) as MenuTheme[]).map((value) => ({
  value,
  label: PALETTES[value].label,
  rail: PALETTES[value].espresso[900],
  accent: PALETTES[value].accent[500],
  canvas: PALETTES[value].canvas
}));

export function menuThemeStyle(theme: MenuTheme | null | undefined): string {
  const palette = PALETTES[theme ?? DEFAULT_MENU_THEME] ?? PALETTES[DEFAULT_MENU_THEME];
  const variables = [
    ...Object.entries(palette.espresso).map(([shade, color]) => `--color-espresso-${shade}: ${color}`),
    ...Object.entries(palette.accent).map(([shade, color]) => `--color-accent-${shade}: ${color}`),
    `--color-canvas: ${palette.canvas}`,
    `--color-line: ${palette.line}`,
    `--color-line-strong: ${palette.lineStrong}`
  ];
  return variables.join('; ');
}
