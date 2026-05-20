# Next.js App Router

## Server Components vs Client Components

Components are Server Components by default. They render on the server, have no state, no effects, no event handlers, and cannot access browser APIs. Use them for data fetching, accessing backend resources, and static markup.

Add `"use client"` at the top of a file to make it a Client Component. Client Components support `useState`, `useEffect`, event handlers, and browser APIs. They hydrate on the client and can re-render.

Server Components can import Client Components, but Client Components cannot import Server Components. Pass Server Component output to Client Components via `children` props — React serializes the server-rendered tree as a slot, not as a live reference.

Never import server-only code (database clients, secrets, `fs`) into Client Components. Use the `server-only` package to enforce this at build time.

## Server Actions

Server Actions are async functions annotated with `"use server"`. They run on the server only. Define them inside Server Components (inline) or in separate files (exported, top-level `"use server"` directive).

```tsx
// app/actions.ts
"use server";
export async function createPost(formData: FormData) {
  await db.insert(formData);
  revalidatePath("/posts");
}
```

Call them from Client Components via `action` prop on `<form>`, `useFormState`, or `useActionState`. They return serializable values. Use `revalidatePath` or `revalidateTag` to purge caches after mutation.

## Route Handlers

Define in `app/api/route.ts` with named exports: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. They receive a `Request` object and return a `Response`. Unlike API Routes in Pages Router, Route Handlers run in the App Router context and can use streaming, Edge Runtime, and Node.js Runtime.

## Middleware

`middleware.ts` at the project root (or `src/`). Runs before route completion on every request. Receives `NextRequest`, returns `NextResponse`. Use for auth checks, redirects, header injection, geolocation. Runs on Edge Runtime by default. Chain logic with a custom `matcher` config array to scope which paths trigger it.

## File Conventions

- `layout.tsx` — wraps children; persists across navigations; receives `children` prop; does not re-render on route changes within its segment.
- `page.tsx` — the UI for a route segment; must be the leaf node; export default component.
- `loading.tsx` — React Suspense boundary; shows while `page.tsx` streams; auto-wraps the segment.
- `error.tsx` — React Error Boundary; catches runtime errors in server/client; receives `error` and `reset` props. Must be a Client Component.
- `not-found.tsx` — catches 404 for the segment and unmatched routes.
- `route.ts` — API Route Handler (replaces `pages/api`).
- `template.tsx` — like `layout.tsx` but remounts on navigation; use for animations or state resets.
- `default.tsx` — fallback for parallel routes that don't match.

Nested layouts compose from root → parent → leaf. Each segment adds to the URL path.