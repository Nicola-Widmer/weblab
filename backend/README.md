# backend — Web Music Player API

**NestJS** (Express platform) + TypeScript. Controllers and DTO classes are the
single source of truth: the `@nestjs/swagger` build plugin reflects over the DTO
types and their `class-validator` decorators to produce the OpenAPI document —
the contract is never written twice. This is the ASP.NET Web API / Swashbuckle
model, with a DI container for the layered architecture in ADR-0002.

> CommonJS, not ESM (the NestJS default — the frontend package stays ESM).

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | `nest start --watch` on `http://localhost:3000` |
| `pnpm openapi` | `nest build` + regenerate `openapi.json` (commit it) |
| `pnpm test` | Vitest + Supertest (SWC transform — see `vitest.config.ts`) |
| `pnpm typecheck` | `tsc --noEmit -p tsconfig.build.json` |
| `pnpm build` / `pnpm start` | `nest build` / run `dist/main.js` |

Run `pnpm openapi` after changing a controller or DTO and commit the
`openapi.json` diff (CI regenerates and `git diff --exit-code`s it).

## Layout

```
src/
  main.ts                  bootstrap: configureApp + Swagger UI at /api/docs, listen
  setup.ts                 configureApp() (global /api prefix, ValidationPipe) + buildOpenApiDocument()
  generate-openapi.ts      standalone: create app, write openapi.json, exit
  app.module.ts            root module — one module per bounded context in imports (ADR-0002)
  users/
    users.module.ts
    users.controller.ts    @Controller('user') — GET /user, PUT /user
    users.service.ts       @Injectable() — stand-in repository, swap for a DB adapter
    dto/user.dto.ts        UserDto (the custom type) + UpdateUserDto, with class-validator rules
test/
  users.e2e.spec.ts        Test.createTestingModule + Supertest
nest-cli.json              enables the @nestjs/swagger plugin (introspectComments: true)
openapi.json               GENERATED, committed; the frontend generates its client from it
```

## Adding an endpoint

1. Add a controller method with the HTTP decorator (`@Get` / `@Post` / …), a
   typed `@Body()` / `@Param()` DTO, and a typed return.
2. New bounded context → new `*.module.ts`, add it to `app.module.ts` `imports`.
3. `pnpm openapi`, commit `openapi.json`.

Validation (required fields, formats, `forbidNonWhitelisted` → 400 on unknown
properties) comes from the `class-validator` decorators on the DTOs via the
global `ValidationPipe` in `setup.ts`. Swagger schema detail (`format: email`,
`minLength`, …) is inferred from those same decorators.

## Notes

- **No zod / no schema DSL.** DTOs are classes; the swagger plugin + reflection
  produce the schemas. This replaces the zod route-table in ADR-0002 / ADR-0006
  — those ADRs need updating.
- **DTOs must be classes**, not `interface`s — runtime reflection needs them.
- Spec is **OpenAPI 3.0** (`@nestjs/swagger` does not emit 3.1);
  `@hey-api/openapi-ts` consumes it fine.
- Paths in the spec are `/user` (not `/api/user`) with `servers: [{ url: "/api" }]`,
  so the generated client's `/api` baseUrl + path line up. `main.ts` still sets a
  global `/api` prefix on the real server.
- Tests transform with **SWC** (`unplugin-swc`), because esbuild — Vitest's
  default — doesn't emit the decorator metadata NestJS needs.
