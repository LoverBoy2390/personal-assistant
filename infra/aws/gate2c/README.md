# Gate 2C account, Region, and cost plan

This directory intentionally contains no deployable AWS template or credential automation.

The canonical machine-readable plan is:

`plans/aws/gate2c/account-region-cost-plan.json`

Gate 2C selects:

- `us-east-1` as the only launch/governed Region.
- `us-east-2` as an inactive future recovery Region.
- A four-account Control Tower landing zone.
- A `$50/month` organization ceiling.
- A `$25/month` nonproduction target and `$35/month` stop/review threshold.

No AWS account, organization, budget, Control Tower landing zone, or resource has been created.
