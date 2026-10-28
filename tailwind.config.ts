import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tinta: { DEFAULT: '#1d2b2a', suave: '#4b5b59', fraca: '#7d8b89' },
        papel: { DEFAULT: '#f6f4ef', cartao: '#ffffff', linha: '#e3dfd5' },
        marca: { DEFAULT: '#0f6b5c', escura: '#0b5247', clara: '#e2f1ed' },
        alerta: { DEFAULT: '#b4462f', clara: '#fbe9e4' },
        aviso: { DEFAULT: '#9a6b0c', clara: '#fbf1da' },
      },
      fontFamily: { sans: ['var(--fonte)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
