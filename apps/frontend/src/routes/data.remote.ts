import { Test } from '@scintilla/shared'
import { repo } from 'remult'
import { query } from '$app/server'

export const getMessage = query(async () => {
	await new Promise((resolve) => setTimeout(resolve, 2000))
	return await repo(Test).find()
})
