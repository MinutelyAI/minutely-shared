import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts", "src/api/index.ts", "src/ui/index.ts", "src/utils/index.ts", "src/tokens/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["react", "react-dom", "lucide-react", "tailwind-merge", "clsx"],
  outDir: "dist",
  splitting: false,
})
