# SVPS Backend

Node + Express + TypeScript + MongoDB. Modules: auth, otp, activities, newsandevents.
Files are stored on local disk with multer (no S3):

- `uploads/activities/`
- `uploads/newsandevents/`

Served publicly at `/uploads/...`.

## Run
1. `cp .env.example .env` and fill values
2. `npm install`
3. `npm run dev`

## Activities  — `/api/activities`
Fields: `topic`, `slug` (auto), `description`, `thumbnail` (1 image, required on create), `galleries` (multiple images)

| Method | Path | Auth |
|---|---|---|
| GET | `/api/activities?page=&limit=&search=` | public |
| GET | `/api/activities/:idOrSlug` | public |
| POST | `/api/activities` | Bearer token |
| PUT | `/api/activities/:id` | Bearer token |
| DELETE | `/api/activities/:id` | Bearer token |

POST/PUT use `multipart/form-data`: `topic`, `description`, `thumbnail` (file), `galleries` (file, repeat for many).
PUT: sending a new `thumbnail` replaces the old one (old file is deleted).
PUT extras: `removeGalleries` = stored path to delete (repeat for many). New files are appended.

## News & Events — `/api/newsandevents`
Fields: `category` (`event` | `news`), `title`, `slug` (auto), `description`, `thumbnail` (1 image, required on create), `galleries`,
`startDate`, `endDate`, `pressRelease` (multiple files: images / pdf / doc / docx)

| Method | Path | Auth |
|---|---|---|
| GET | `/api/newsandevents?category=&search=&from=&to=&page=&limit=` | public |
| GET | `/api/newsandevents/:idOrSlug` | public |
| POST | `/api/newsandevents` | Bearer token |
| PUT | `/api/newsandevents/:id` | Bearer token |
| DELETE | `/api/newsandevents/:id` | Bearer token |

Rules: `startDate` required when category is `event`; `endDate` must be >= `startDate`.
PUT extras: `removeGalleries`, `removePressRelease` (stored paths, repeat for many).

Slug is generated from topic/title and made unique (`annual-day`, `annual-day-2`, ...).
It changes when the topic/title changes. Deleting a record also deletes its files.

## Contact & campus-visit APIs

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/contact` | public (5 / 10 min / IP) | Contact Us form: `name, email, message` (+ `phone, subject`) |
| GET | `/api/contact` | admin | List, `?status=new\|read\|replied&search=&page=&limit=` |
| GET | `/api/contact/stats` | admin | `total, new, read, replied, today, uniquePeople` |
| PATCH | `/api/contact/:id` | admin | `{ status }` |
| DELETE | `/api/contact/:id` | admin | Delete |
| POST | `/api/visits` | public (5 / 10 min / IP) | Book a visit: `name, email, phone, preferredDate (yyyy-mm-dd)` (+ `purpose, message`) |
| GET | `/api/visits` | admin | List, `?status=pending\|confirmed\|completed\|cancelled&search=&upcoming=true` |
| GET | `/api/visits/stats` | admin | `total, pending, confirmed, completed, cancelled, upcoming, today, uniquePeople` |
| PATCH | `/api/visits/:id` | admin | `{ status, scheduledDate, adminNote }` (confirm / reschedule / cancel) |
| DELETE | `/api/visits/:id` | admin | Delete |
