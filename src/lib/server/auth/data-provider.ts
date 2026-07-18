import type { DataProvider } from 'remult'

let resolve: ((dp: DataProvider) => void) | null = null
export const dataProvider: Promise<DataProvider> = new Promise((r) => (resolve = r))

export function setProvider(dp: DataProvider) {
	resolve?.(dp)
	resolve = null
}
