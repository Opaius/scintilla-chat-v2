import {
	type DataProvider,
	type EntityDataProvider,
	type EntityDataProviderFindOptions,
	type EntityDataProviderGroupByOptions,
	type EntityMetadata,
	Filter,
	type InsertOrUpdateOptions,
} from 'remult'
import { getTenantContext } from '$lib/server/tenant/context'

type OrgScopedEntity = { organizationId: string }
const scopedTables = new Set(['user', 'session', 'account'])

class TenantScopedEDP implements EntityDataProvider {
	constructor(
		private inner: EntityDataProvider,
		private entity: EntityMetadata,
	) {}

	private orgFilter(tenantId: string): Filter {
		return Filter.fromEntityFilter(this.entity as EntityMetadata<OrgScopedEntity>, {
			organizationId: tenantId,
		})
	}

	private applyOrgFilter(where: Filter | undefined, tenantId: string): Filter {
		if (!scopedTables.has(this.entity.key)) return where ?? new Filter(() => {})
		const org = this.orgFilter(tenantId)
		if (!where) return org
		return new Filter((add) => {
			where.__applyToConsumer(add)
			org.__applyToConsumer(add)
		})
	}

	private tenantFilter(where?: Filter): Filter {
		const tenantId = getTenantContext()?.organizationId
		if (!tenantId) return where ?? new Filter(() => {})
		return this.applyOrgFilter(where, tenantId)
	}

	async find(options?: EntityDataProviderFindOptions) {
		options = { ...options, where: this.tenantFilter(options?.where) }
		return this.inner.find(options)
	}

	count(where?: Filter) {
		return this.inner.count(this.tenantFilter(where))
	}

	async groupBy(options?: EntityDataProviderGroupByOptions) {
		options = { ...options, where: this.tenantFilter(options?.where) }
		return this.inner.groupBy(options)
	}
	private async requireTenantAccess(): Promise<boolean> {
		const ctx = getTenantContext()
		if (ctx == null) return true
		if (ctx.organizationId == null) return true
		if (!scopedTables.has(this.entity.key)) return true
		const rows = await this.inner.find({ where: this.orgFilter(ctx.organizationId), limit: 1 })
		return rows.length > 0
	}

	async update(
		id: string | number,
		data: Record<string, unknown>,
		options?: InsertOrUpdateOptions,
	) {
		const ok = await this.requireTenantAccess()
		if (!ok) throw new Error('Record not found in tenant')
		return this.inner.update(id, data, options)
	}

	async delete(id: string | number) {
		const ok = await this.requireTenantAccess()
		if (!ok) throw new Error('Record not found in tenant')
		return this.inner.delete(id)
	}

	async insert(data: Record<string, unknown>, options?: InsertOrUpdateOptions) {
		const tenantId = getTenantContext()?.organizationId
		if (tenantId && scopedTables.has(this.entity.key)) {
			return this.inner.insert({ ...data, organizationId: tenantId }, options)
		}
		return this.inner.insert(data, options)
	}
}

export class TenantScopedDataProvider implements DataProvider {
	constructor(private inner: DataProvider) {}

	getEntityDataProvider(entity: EntityMetadata): EntityDataProvider {
		return new TenantScopedEDP(this.inner.getEntityDataProvider(entity), entity)
	}

	transaction(action: (dp: DataProvider) => Promise<void>): Promise<void> {
		return this.inner.transaction((innerDp) => action(new TenantScopedDataProvider(innerDp)))
	}

	ensureSchema?(entities: EntityMetadata[]): Promise<void> {
		return this.inner.ensureSchema?.(entities) ?? Promise.resolve()
	}
}
