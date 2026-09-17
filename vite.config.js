import { defineConfig } from 'vite';
import { adminPlugin } from './server/admin.mjs';

export default defineConfig({ plugins: [adminPlugin()] });
