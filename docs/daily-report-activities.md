# Daily report activities

Daily reports retain one report per user per day. The existing UTC-based creation/edit/delete date rule remains unchanged. Owner is read-only at the API and UI layers.

Each activity stores description, target, status (`On Progress`, `Selesai`, `Pending`), result, an optional SO reference, and optional tagged user IDs. New reports require 1–20 activities; summary is optional. Photos belong to an activity, with a maximum of five photos per report and 5 MB per photo (JPG/PNG/WEBP).

## Access

- Authors can read their complete reports and edit/delete them on the report date.
- Owner can read all reports and attachments and cannot perform report writes.
- Tagged users can read only matching activities and their attachments. Report-wide summary and legacy report-level images are excluded. Direct attachment downloads enforce the same restriction.
- Removing a tag immediately revokes API access to that activity and its images.
- Tagging does not grant access to SO details. The SO report-options endpoint exposes only ID, number, and customer name to authenticated users. The Identity service verifies SO references through Production and stores the canonical number.

## API

- `GET /api/v1/reports/users`: active users, limited to ID/name/role for tagging.
- `GET /api/v1/reports/mentioned`: paginated reports projected to activities tagging the caller.
- `GET /api/v1/reports`: Owner filters include `salesOrder` and `status`, matched within the same activity.
- `POST /api/v1/reports` and `PUT /api/v1/reports/{id}` use multipart fields: `summary`, `tasks[0].description`, `.target`, `.status`, `.result`, `.salesOrderId`, `.salesOrderNumber`, repeated `.taggedUserIds`, `.images`, and `.attachmentCaptions`. Creation also includes `reportDate`; updates retain `.id` and may include repeated `removedAttachmentIds`.
- Activity edits, photo additions/removals, and tag changes persist in one database save. Failed uploads clean up newly stored files.
- Notifications refresh every 60 seconds, on window focus, and after report changes in the current tab. They use the most recent 50 reports mentioning the user and support dismissal.

## Deployment

Deploy frontend, Identity API, and Production API together: the task payload and update content type have changed. Identity runs migration `20261107000000_AddReportActivities` through its existing startup migration flow. Existing text tasks and report-level photos remain readable by their author and Owner; old photos are not automatically assigned to an activity.

Set `ProductionApi:Address` (`ProductionApi__Address` as an environment variable) for Identity. Local development uses `http://localhost:5003/`; Docker compose variants use `http://production-api:8080/`. The lookup forwards the caller's authorization header and does not change SO status.

## Verification

- `dotnet test tests/Identity.API.Tests/Identity.API.Tests.csproj --no-restore`
- `dotnet build src/Services/Production.API/Production.API.csproj --no-restore`
- `npm run test -- --run src/app/pages/Reports/DailyReport.test.tsx src/app/services/dailyReportApi.test.ts`
- `npm run build`

The tests cover activity/attachment isolation, tag revocation, Owner write rejection, optional fields and multipart binding over HTTP, SO label verification, upload cleanup, editing identity preservation, and PostgreSQL migration/query generation. Migration generation is tested without applying it to a running database.
