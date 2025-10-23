# Supabase Authentication

The browser and mobile clients keep authenticating with Supabase Auth (JWT bearer tokens). The API now enforces tenant scoping, so every authenticated request must also specify which company context it is operating in.

## Sending Requests

```
Authorization: Bearer <supabase-jwt>
X-Company-Id: 0199c789-fcc2-7dec-985d-db07b8783b97
```

- `Authorization` is the Supabase JWT that the client already has.
- `X-Company-Id` must contain the UUID of the active company. If a user belongs to only one company, the header is optional; otherwise the request fails with `401`.
- API filters such as `?company=/api/companies/{id}` continue to work, but they no longer override the enforced company scope.

## Error Reference

| Status | Message                                     | Description                                       |
|--------|---------------------------------------------|---------------------------------------------------|
| 401    | Company context is required                 | Provide `X-Company-Id` or switch to a single tenant |
| 401    | You do not have access to the requested company | User is not linked to that tenant                  |
| 401    | Invalid Supabase token                      | Token expired or malformed                        |

## Frontend Checklist

1. Attach `X-Company-Id` whenever the user selects a company in the UI.
2. Store the selected company UUID in application state so it is available for all fetchers.
3. Retry behaviour: refresh Supabase session when receiving `401 Invalid Supabase token`.

No changes are required for anonymous routes (`/api/docs`, `OPTIONS`) or API-key based automation.
