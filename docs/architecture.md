# Architecture Notes

## Backend shape

The MVP keeps the service split requested for production:

- `auth-service`
- `source-service`
- `mobile-service`
- `admin-service`
- `operator-service`
- `alert-service`
- `document-service`
- `notification-service`

For local verification, the services share a lightweight in-memory platform state exposed through separate FastAPI applications. This keeps the domain contract and service boundaries intact while avoiding hard dependency on missing local infrastructure.

## Event flow

- `source-service` creates source registrations and emits source events.
- `mobile-service` syncs offline jobs and emits lot events.
- `operator-service` records depot events and shipment events.
- `alert-service` evaluates rule breaches.
- `admin-service` reads projected lot/source/alert state.
- `document-service` generates BDC PDFs.
- `notification-service` records outbound email messages for the proof of concept.

## Mobile-first scope

The Android app targets:

- login
- tournée bootstrap
- offline tonte lot creation
- exception reporting
- field source registration
- QR display
- sync queue visibility

