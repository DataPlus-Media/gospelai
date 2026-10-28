# Signed-in notes database

Signed-in notes use PostgreSQL through the server's runtime-managed
`DATABASE_URL`. Guest notes remain in device-local SQLite and are not imported
automatically after sign-in.

## Development

The schema source is `database/study-notes.sql`. Apply it to the Replit
development database using the database tooling. Do not run it from server
startup or a deployment build hook.

## Production

For Replit-managed PostgreSQL, open Publishing → Adjust settings and enable
**Create production database** when no production database exists. Publish
applies the development schema to production. Do not enable the option to copy
development data unless that is explicitly wanted; the notes table should start
empty for a new production database.

Do not manually supply or copy `DATABASE_URL`; Replit manages the environment's
connection. Keep the Production `CLERK_PUBLISHABLE_KEY` as the raw existing live
publishable key, without assignment text or quotes.

After publishing, verify creating, listing, editing and deleting a note with a
signed-in test account. Check the same account on a second device, and check
that a different account cannot see the test note. Mocked API checks alone do
not verify database provisioning or the deployed schema.

The API logs only an allowlisted database error code, request method and
operation. It must never log tokens, connection strings or note contents.
