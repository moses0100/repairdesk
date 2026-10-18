# RepairDesk MVP

Laravel 13 + Inertia 3 / React 19 / TypeScript. SQLite is the local learning default; PostgreSQL is tested separately in CI. UI uses a restrained blue/navy workspace informed by UI UX Pro Max's minimal dashboard guidance. Its marketing-hero suggestion was not used because cashier tasks take priority. All sample products/customers are fictional.

## Checkout guarantees

Amounts are integer satang. The server fetches product prices; client totals are display-only. Each cashier's UUID retry key is unique with a request hash. Identical retries return the same sale; changed payloads with that key are rejected. Checkout locks the cashier, then products in ID order, then an optional repair. Sale, line snapshots and stock movements commit together. Insufficient stock/payment rolls the entire transaction back. PostgreSQL row locks protect different cashiers competing for stock. SQLite is for local single-store practice; no offline queue is implemented.

Paid sale lines retain names/prices even when product data changes. Repair billing has a unique repair ID. A repair must be ready and priced before payment; delivery requires payment. Version checks reject stale repair edits. Paid repairs cannot change price or roll back state. Cancelled/delivered work is final in this MVP. Refund/void workflows will require explicit reversing entries, not deletion of paid sales.

## Boundaries

- Three staff roles: manager, cashier, technician. Technicians see assigned repair jobs and cannot sell, change repair prices, deliver, cancel or manage stock.
- Session authentication, CSRF protection, login throttling, server-side authorization and no-store responses. Demo credentials are shown/seeded only in local/testing environments. Do not expose the local demo as a public production shop.
- Transfer payments are manually confirmed by staff. No payment gateway, bank verification, VAT invoicing, cash-drawer integration, multiple branches, returns, stock reservation or customer portal is included yet.
- The repair reference inspired the business workflow; source code, branding and sample personal data were created for this project.

## Checks

Local: 18 PHP tests / 83 assertions, Pint, TypeScript/build, four Chrome browser scenarios (cash receipt/mobile, inventory adjustment, full repair payment/delivery and technician restrictions). GitHub CI is configured to run the PHP suite on PostgreSQL and a real two-process stock race: two cashiers, one item, exactly one successful sale. The first remote run is pending approval to publish the source; PostgreSQL/concurrency checks have not yet run locally.
