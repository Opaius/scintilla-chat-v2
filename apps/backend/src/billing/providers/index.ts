import { registerBillingProvider } from '../webhook.js'
import { creemProvider } from './creem.js'

// Register every billing provider adapter here. Add a new file + this line to
// support another provider; the webhook route and metering need no changes.
registerBillingProvider(creemProvider)
