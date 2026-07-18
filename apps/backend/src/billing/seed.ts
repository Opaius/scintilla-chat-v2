import { Plan } from '@scintilla/shared'
import { remult } from 'remult'

const DEFAULT_PLANS: Array<{ id: string } & Partial<Plan>> = [
	{
		id: 'free',
		name: 'Free',
		priceMonthly: 0,
		includedMinutes: 100,
		seatLimit: 1,
		features: ['100 min/mo', '1 seat', 'Community support'],
		active: true,
	},
	{
		id: 'pro',
		name: 'Pro',
		priceMonthly: 29,
		includedMinutes: 2000,
		seatLimit: 5,
		features: ['2,000 min/mo', '5 seats', 'Priority support', 'Realtime'],
		active: true,
	},
	{
		id: 'scale',
		name: 'Scale',
		priceMonthly: 99,
		includedMinutes: 10000,
		seatLimit: 25,
		features: ['10,000 min/mo', '25 seats', 'SSO', 'Priority support'],
		active: true,
	},
]

// Idempotent: only seeds when the catalog is empty. Safe to call per request.
export async function seedPlans() {
	const repo = remult.repo(Plan)
	if ((await repo.count()) > 0) return
	for (const p of DEFAULT_PLANS) {
		await repo.upsert({ where: { id: p.id }, set: p })
	}
}
