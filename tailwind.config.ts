import type { Config } from "tailwindcss";

export default <Config>{
  corePlugins: {
    preflight: false,
  },
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
