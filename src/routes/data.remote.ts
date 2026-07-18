import { repo } from 'remult'
import { query } from '$app/server'
import { Test } from '$lib/entities/test-todo'

export const getMessage = query(async () => {
	await new Promise((resolve) => setTimeout(resolve, 2000))
	return await repo(Test).find()
})
