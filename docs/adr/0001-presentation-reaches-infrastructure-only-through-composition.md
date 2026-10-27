---
status: accepted
---

# Presentation reaches infrastructure only through the composition container

`src/app` (Next.js presentation) may import `domain`, `application` and a single module of `composition` (the container), but never `infrastructure`. Cron route handlers therefore call use cases exposed by the container, and the Supabase admin client is created only in `composition`. This follows standard Clean Architecture, where presentation knows use cases and not adapters, and it replaces the SPEC exception that let cron handlers import the admin client. The cost is that handlers and pages cannot reach an adapter directly, even when that would be shorter.
