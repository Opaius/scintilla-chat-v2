import { describe, it, expect } from 'vitest';
import { getTenantContext, runWithTenantContext, requireTenantContext } from '../src/lib/server/tenant/context.js';

describe('tenant-context', () => {
	it('returns undefined when no context is set', () => {
		expect(getTenantContext()).toBeUndefined();
	});

	it('returns the context when set', () => {
		runWithTenantContext({ organizationId: 'reader-1', domain: 'reader1.example.com' }, () => {
			const ctx = getTenantContext();
			expect(ctx).toEqual({ organizationId: 'reader-1', domain: 'reader1.example.com' });
		});
	});

	it('nested contexts are isolated', () => {
		runWithTenantContext({ organizationId: 'outer', domain: 'outer.com' }, () => {
			runWithTenantContext({ organizationId: 'inner', domain: 'inner.com' }, () => {
				expect(getTenantContext()?.organizationId).toBe('inner');
			});
			expect(getTenantContext()?.organizationId).toBe('outer');
		});
	});

	it('requireTenantContext throws when no context', () => {
		expect(() => requireTenantContext()).toThrow('No tenant context');
	});

	it('requireTenantContext returns context when set', () => {
		runWithTenantContext({ organizationId: 'reader-1', domain: 'r1.com' }, () => {
			expect(requireTenantContext().organizationId).toBe('reader-1');
		});
	});

	it('can pass a value through runWithTenantContext', () => {
		const result = runWithTenantContext({ organizationId: 'r1', domain: 'r1.com' }, () => {
			return getTenantContext()?.organizationId;
		});
		expect(result).toBe('r1');
	});

	it('context is cleared after runWithTenantContext completes', () => {
		runWithTenantContext({ organizationId: 'r1', domain: 'r1.com' }, () => {
			expect(getTenantContext()).toBeDefined();
		});
		expect(getTenantContext()).toBeUndefined();
	});
});
