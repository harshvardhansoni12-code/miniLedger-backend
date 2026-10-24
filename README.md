# MiniLedger Backend

MiniLedger is an Express API for phone-based sign-in and tracking loans. It uses PostgreSQL through Prisma.

## Requirements

- Node.js (an active LTS release) and npm
- PostgreSQL, with a database created for this application

## Setup

1. Install dependencies from the project directory:

   ```sh
   npm install
   ```

2. Create `src/.env` (this file is ignored by Git) and configure the database and server:

   ```dotenv
   DATABASE_URL="postgresql://postgres:your-password@localhost:5432/miniledger?schema=public"
   PORT=3000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

   Replace the database username, password, host, and database name with your PostgreSQL settings. `CORS_ORIGIN` is a comma-separated list of allowed frontend origins; the example is suitable for a local frontend running on port 5173.

3. Apply the checked-in database migrations and generate the Prisma client:

   ```sh
   npm run db:deploy
   npm run db:generate
   ```

4. Start the development server:

   ```sh
   npm run dev
   ```

   The API listens on `http://localhost:3000` by default. Visit `/` to check that it is responding; it returns `{"message":"MiniLedger API"}`.

## Production build

For a local production run, set `src/.env`, apply migrations, build, and start the API:

```sh
npm run db:deploy
npm run db:generate
npm run build
npm run start:local
```

Set `NODE_ENV=production` and configure `CORS_ORIGIN` with the exact frontend origins that should be allowed. In production, OTP codes are not included in the API response.

The included `render.yaml` configures Render to build with `npm run build` and start the compiled server with `npm start`. Configure `DATABASE_URL` and `CORS_ORIGIN` in the Render service environment. The start command runs `dist/index.js`; do not set it to `node index.js`, because there is no root-level `index.js`.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API with TypeScript watch mode |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm start` | Run the compiled API using platform-provided environment variables |
| `npm run start:local` | Run the compiled API using `src/.env` |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:deploy` | Apply checked-in migrations |
| `npm run db:push` | Push the Prisma schema to the database without creating a migration |
| `npm run db:studio` | Open Prisma Studio |

The Prisma scripts read `DATABASE_URL` from `src/.env`; the production start command uses environment variables supplied by the hosting platform.

## Authentication and API

In development, request an OTP with `POST /auth/request-otp` and a phone number in E.164 format, for example `+14155552671`. The mock OTP is returned in the response and logged to the server console. Verify it with `POST /auth/verify-otp`; use the returned `accessToken` as a bearer token for authenticated routes.

All `/api` routes require `Authorization: Bearer <accessToken>`. Available routes:

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/auth/request-otp` | Generate a development OTP |
| `POST` | `/auth/verify-otp` | Verify an OTP and receive an access token |
| `POST` | `/api/loans` | Create a loan |
| `GET` | `/api/loans` | List the signed-in user's loans |
| `PATCH` | `/api/loans/:id/repay` | Mark a loan as repaid |
| `GET` | `/api/summary` | Get lending, repayment, and overdue totals |

OTP challenges and sessions are stored in memory, so they are cleared when the server restarts. The OTP flow is mocked; configure a real delivery provider and durable session storage before using this authentication flow in production.
