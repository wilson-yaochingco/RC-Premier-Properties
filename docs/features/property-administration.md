# Property Administration

Status: Phase 3A protected shell, private reads, draft creation and draft-content editing
implemented. Publishing, availability transitions and media remain deferred.

## Staff experience

The `/admin` route redirects to `/admin/properties`. The protected shell requests
`GET /auth/session` from the browser with credentials included. While that check is in
progress it shows a loading state. A missing or expired session shows a staff sign-in
link that starts the backend Auth0 route with the exact allowlisted return URL
`<frontend-origin>/admin`.

After authentication, the shell shows the local staff display name, property navigation
and local-session logout. The CSRF token stays in React memory and is passed only in the
`X-CSRF-Token` header on backend writes. It is never stored in local or session storage.

Admin pages include:

- `/admin/properties` — private draft list and empty/error/forbidden states;
- `/admin/properties/new` — create an available private draft; and
- `/admin/properties/[id]/edit` — load private detail and edit draft content.

The forms use real labels, field-level API errors, a focusable error summary, keyboard
controls and disabled fieldsets/submission while saving. Successful creation links to
the new editor; successful editing keeps the refreshed draft in place. A `401` received
after bootstrap returns the shell to an explicit expired-session state.

## Lifecycle boundary

This slice edits content only. There is no publication-status or availability input.
The backend assigns new records to `draft` and `available`, and draft updates use a
server-owned `publicationStatus: draft` predicate. Frontend controls are convenience,
not authorization; all access, permission and CSRF decisions remain in Express.

The editor intentionally excludes uploads/media, internal notes, owner data, exact
internal coordinates and private address management. It does not implement publishing,
unpublishing, archiving, availability changes, inquiry management or staff management.

## Search indexing and caching

The admin layout exports `noindex`, `nofollow` and `noarchive` metadata. `robots.txt`
already disallows `/admin`, and authenticated API responses use `no-store`. These are
indexing/cache controls, not substitutes for server authorization.

## External acceptance boundary

Automated browser tests mock only the network boundary and use no Auth0 credential.
The owner has reported that the configured Auth0 Free passkey flow redirects to the
frontend. The application session response, authenticated admin data load, CSRF-backed
write and logout still require the manual browser pass in
[`../development/auth0-setup.md`](../development/auth0-setup.md).
