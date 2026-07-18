import { defineConfig } from 'tsup'

// Entities use legacy Remult decorators (@Entity/@Fields/...). They must be
// compiled ONCE here (not re-compiled by every consumer) so the decorator
// metadata is stable regardless of which bundler imports the package.
export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	dts: true,
	clean: true,
	target: 'es2022',
	tsconfig: 'tsconfig.json',
})
