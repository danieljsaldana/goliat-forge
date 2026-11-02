/** A static React frontend; the private Node API owns business logic. */
import { fileURLToPath } from 'node:url';
export default {
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  output: 'export',
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: { unoptimized: true },
};
