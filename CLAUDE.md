# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: RideUp — Carpool Booking System

Vietnamese carpool / ride-sharing platform. Monolithic Spring Boot backend; frontend and docs folders are scaffolded but currently empty.

## Build, Run, Test

All commands run from `rideup-backend/` (the only module that contains code today).

```bash
# Build
mvn clean package            # produces target/rideup-backend-0.0.1-SNAPSHOT.jar
mvn -DskipTests package      # skip tests

# Run (dev profile is the default; uses application-local.yml)
mvn spring-boot:run
# or after packaging:
java -jar target/rideup-backend-0.0.1-SNAPSHOT.jar

# Tests
mvn test                     # all tests
mvn -Dtest=ClassName test    # single test class
mvn -Dtest=ClassName#method  test   # single test method
```

- **Java:** 21 (set in `pom.xml`)
- **Build tool:** Maven 3.x (Spring Boot parent `3.3.5`)
- **Logging:** stdout/stderr appended to `rideup-backend/logs/app.out` and `app.err`; `startup.log` captures the boot banner. The repo's `.gitignore` excludes `target/`, `.idea/`, `logs/`, `.env`.

## Local Infrastructure

Required services for a working dev environment:

| Service  | Default                                | Notes |
|----------|----------------------------------------|-------|
| MySQL    | `localhost:3306` db `rideup`, user `root`/`root` | Create DB with `db/create_database.sql`. |
| Redis    | `localhost:6379`                       | Token storage (see Security). |
| MongoDB  | configured but **autoconfig is excluded** in `application.yml` | The chat feature uses MySQL `conversation`/`message` tables, not Mongo, despite the dependency being on the classpath. |

Connection strings and credentials are read from env vars (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `MONGO_URI`, `JWT_SECRET`) with sane defaults in `application.yml` / `application-local.yml`.

### Database schema

`flyway.enabled=false` and `spring.jpa.hibernate.ddl-auto=update` — Hibernate generates/updates the schema. The canonical reference schema lives in `db/_backup/V1__init.sql` (commented `-- Tạo database + user cho RideUp ...` at the top; `db/create_database.sql` is just the `CREATE DATABASE` statement).

Tables: `app_user`, `app_user_role`, `driver_profile`, `vehicle`, `refresh_token`, `province`, `ward`, `trip`, `trip_stop`, `booking`, `payment`, `refund`, `conversation`, `conversation_member`, `message`, `call_session`, `notification`, `review`.

> Note: the SQL backup uses table `app_user_role`, but the JPA `User.roles` collection maps to `user_roles`. Don't reconcile by editing the SQL — update Hibernate entities or re-run migrations.

## Architecture

Single Spring Boot monolith (`com.rideup` package), port 8080, servlet context-path `/api`. Standard layered structure:

```
controller/    REST endpoints (@RestController)
service/       Business logic (@Service)
repository/    Spring Data JPA interfaces
entity/        @Entity classes (1:1 with tables)
dto/request    Inbound payloads (Bean Validation)
dto/response   Outbound payloads
common/        ApiResponse wrapper, AppException, GlobalExceptionHandler
config/        RedisConfig (JSON serializer)
security/      JWT filter chain, JWT service, user details, props
constant/      Redis key prefixes, TTLs
enums/         Role, BookingStatus, PaymentStatus, TripStatus, VehicleType, MessageType, etc.
```

### HTTP conventions

Every controller returns `ApiResponse<T>` (`{ code, message, data }`) via the static helpers `ApiResponse.success(data)` / `ApiResponse.error(code, message)`. Errors throw `AppException` (HTTP status + int code); `GlobalExceptionHandler` converts them, plus validation, auth, and access-denied exceptions, into JSON `ApiResponse` payloads.

`SecurityConfig` is stateless, CSRF-disabled, and permits:
- `POST /auth/**`
- `/public/**`
- `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`
- `/ws/**` (WebSocket handshake)

CORS is locked to `http://localhost:5173` and `http://localhost:3000` — update both `SecurityConfig.corsConfigurationSource` and `app.cors.allowed-origins` when adding new frontends.

### Authentication (the one end-to-end slice today)

- **`AuthController`** at `/auth` exposes `POST /register`, `/authentication` (login), `/logout`, `/refresh-token`. This is currently the only controller — every other feature (trips, bookings, payments, chat, notifications, reviews) has entities and repositories but no service or controller yet.
- **`AuthenticationService`** issues:
  - **Access token** — JWT (HS256, 15 min default) carrying `sub=userId`, `email`, `roles`, `type=access`. Whitelisted in Redis at key `auth:access:<token>` with `RedisKeyTTL.ACCESS_TOKEN_TTL` (15 min). On logout or refresh it's deleted from Redis — that's the revocation mechanism.
  - **Refresh token** — random UUID stored as SHA-256 hash (Base64) in `refresh_token` table with 30-day TTL; also cached in Redis at `auth:refresh:<hash>`. Rotation on every refresh: old row marked `revoked`, new pair issued.
  - Scheduled job `cleanupExpiredTokens` runs daily at 02:00 (`@Scheduled cron = "0 0 2 * * ?"`) to purge expired `refresh_token` rows.
- **`JwtAuthFilter`** runs once per request, parses the `Authorization: Bearer ...` header, verifies the access token in Redis (rejects if missing), and sets the `SecurityContext` via `CustomUserDetailsService.loadById(userId)`. Authorities are emitted as `ROLE_<Role>`.

JWT secret must be ≥ 32 bytes (enforced in `JwtService.@PostConstruct`). Default in `application-local.yml` is a placeholder — set `JWT_SECRET` in real deployments.

### Domain model

- **User** (`app_user`) → many roles (`CUSTOMER`, `DRIVER`, `ADMIN`) via `@ElementCollection`; one optional `DriverProfile`.
- **DriverProfile** has a 1:1 `Vehicle` (unique per driver, unique plate).
- **Trip** belongs to a driver + vehicle, has start/end `Province`, optional `TripStop`s, optimistic-lock `version`, and tracks `seat_total` / `seat_available` (bookings decrement the latter).
- **Booking** belongs to a customer + trip, has `BookingStatus` and `PaymentStatus`, optional pickup/dropoff `Ward`, optimistic-lock `version`, and snapshots `trip_version_at_reserve` to detect concurrent seat loss. One-to-one `Payment`, which can have a `Refund`.
- **Conversation / ConversationMember / Message / CallSession** model driver↔customer chat scoped to a booking (MySQL tables, not Mongo).
- **Notification** and **Review** sit on top of the trip lifecycle.

All entities use Lombok (`@Getter @Setter @Builder @FieldDefaults(level = PRIVATE)`), Hibernate `@CreationTimestamp`/`@UpdateTimestamp`, UUID string IDs (`CHAR(36)`), `EnumType.STRING` for status fields, and `@Version` for optimistic locking where concurrency matters.

### WebSocket

`spring-boot-starter-websocket` is on the classpath and `/ws/**` is permitted, but no `WebSocketConfig` or STOMP controller is implemented yet. Plan to add one before wiring the chat/call session features.

## Conventions

- Lombok everywhere; prefer `@RequiredArgsConstructor` + `@FieldDefaults(level = PRIVATE, makeFinal = true)` for DI.
- All API responses wrap in `ApiResponse` — do not return raw entities or `ResponseEntity<T>` from controllers.
- Throw `AppException.notFound(...)` / `.badRequest(...)` / etc. rather than `ResponseStatusException`; the global handler takes care of the response shape.
- Redis keys always use the prefixes in `RedisKey`; TTLs in `RedisKeyTTL`.
- When adding entities, mirror the column names and lengths from `db/_backup/V1__init.sql` so the manually-managed schema stays compatible with Hibernate's `update` mode.
- Swagger UI lives at `http://localhost:8080/api/swagger-ui.html` (context-path `/api` + springdoc path).

## Repo Layout

```
RideUp/
├── rideup-backend/    Spring Boot service (the only working module)
│   ├── pom.xml
│   └── src/main/java/com/rideup/...
├── rideup-frontend/   (empty)
├── docs/              (empty)
├── db/
│   ├── create_database.sql
│   └── _backup/V1__init.sql
└── do_an_v0.5 (2).docx    Project specification (Vietnamese), outside the build
```