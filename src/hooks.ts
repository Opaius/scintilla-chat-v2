import type { Transport, Transporter } from '@sveltejs/kit'
import { type ClassType, repo } from 'remult'
import { Account, Session, User, Verification } from '$lib/entities/auth'
import { Test } from '$lib/entities/test-todo'

// Entities shared between backend and frontend for auto-serialization
type Entity = User | Session | Account | Verification | Test
type EntityClass = typeof User | typeof Session | typeof Account | typeof Verification | typeof Test
const entities: EntityClass[] = [User, Session, Account, Verification, Test]

const entityTransporter: Transporter<Entity, Record<string, unknown>> = {
	encode: (value) => {
		for (const element of entities) {
			if (value instanceof element) {
				return {
					...repo(element as ClassType<Entity>).toJson(value),
					entity_key: repo(element as ClassType<Entity>).metadata.key,
				}
			}
		}
	},
	decode: (data) => {
		for (const element of entities) {
			if (data.entity_key === repo(element as ClassType<Entity>).metadata.key) {
				return repo(element as ClassType<Entity>).fromJson(data) as Entity
			}
		}
		return undefined as unknown as Entity
	},
}

export const transport: Transport = {
	remultTransport: entityTransporter,
}
