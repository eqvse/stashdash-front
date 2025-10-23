# API Key Authentication

This guide explains how first‑party integrations (backoffice, middleware, cron jobs) should authenticate against the Stashdash API. Browser clients must continue to use Supabase authentication – never expose an API key in client-side code.

## Provisioning a Key

There are two ways to mint credentials:

### A. From the UI / API (recommended for admins)

1. Authenticate in the app as a company owner or admin.
2. Send a POST request to `POST /api/api_keys` with a JSON payload:

   ```bash
   curl https://api.stashdash.io/api/api_keys \
     -H "Authorization: Bearer <supabase-jwt>" \
     -H "X-Company-Id: <companyUuid>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Backoffice Sync"}'
   ```

   The response includes `plainTextKey` — display it once to the user and never store it client-side.

### B. From the console (operators / automation)

1. SSH into the environment that can talk to the production database.
2. Run the helper command:

   ```bash
   php bin/console app:api-key:create <companyUuid> "<key name>"
   ```

3. Copy the plain text key that is printed once. **It will never be shown again.**
4. Store the key securely (1Password, Vault, AWS Secrets Manager, etc.).

## Using the Key

Send the secret with each request via the `X-API-Key` header (preferred) or an `Authorization` header.

```
X-API-Key: abcd1234…
```

or

```
Authorization: ApiKey abcd1234…
```

The backend automatically scopes every request to the company that owns the key, so you do not need to pass the `company` IRI explicitly. Attempts to access or mutate data belonging to another tenant return `403`.

### Example Requests

```bash
curl https://api.stashdash.io/api/inventory_movements \
  -H "X-API-Key: $STASHDASH_API_KEY" \
  -G --data-urlencode "itemsPerPage=10"
```

```bash
curl https://api.stashdash.io/api/inventory_movements \
  -H "X-API-Key: $STASHDASH_API_KEY" \
  -H "Content-Type: application/ld+json" \
  -d '{"variant":"/api/product_variants/0199…","movementType":"ADJUST","qtyDelta":"2"}'
```

## Frontend Changes

- **Do not embed** the API key in browser bundles or public environment variables.
- For Next.js / Remix / other server-rendered apps: store the key in the server’s environment (`process.env.STASHDASH_API_KEY`) and proxy requests through the framework’s API routes.
- Browser clients continue to use Supabase JWTs. Make sure they also send `X-Company-Id` (see `docs/SUPABASE_AUTH.md`).

## Rotating & Revoking Keys

- To revoke a key, delete it from the `api_keys` table or add a `revoked_at` timestamp (a dedicated command will be added later).
- Generate a new key and update any integrations before revoking the old one.
- Audit the `last_used_at` column to spot unused or stale keys.

## Error Reference

| Status | Meaning                                    | Recommended Action                         |
|--------|--------------------------------------------|--------------------------------------------|
| 401    | Missing or invalid key                     | Check header spelling, ensure key is valid |
| 403    | Key revoked or attempting cross-company access | Confirm key is active and scoped correctly |
| 422    | Business validation failure                | Inspect payload and retry                  |

For further integration help, contact the backend team.
