# Nexus AI SEO, AEO, GEO, and Auth Audit

## Implemented

- Descriptive title and meta description for AI document Q&A and RAG intent.
- Open Graph and Twitter metadata without guessed canonical or temporary URLs.
- JSON-LD for Organization, WebSite, and SoftwareApplication.
- Semantic public FAQ content covering RAG, PDF Q&A, citations, and conversational mode.
- Public `/docs` page with verified architecture, ingestion, retrieval, API, authentication, and limitation explanations.
- `robots.txt` allowing the public homepage while disallowing API, app, login, and signup paths.
- `llms.txt` with verified capabilities, data-handling notes, and limitations.
- Noscript content with a crawlable H1 and workflow explanation.
- Email/password signup and login backed by Neon Postgres.
- Passwords stored as salted scrypt hashes; plaintext passwords are never persisted.
- Hashed session tokens in HttpOnly cookies with cross-site Preview-safe cookie attributes.

## Requires production configuration

- Set `PUBLIC_SITE_URL` to the real production origin before adding canonical URLs, `og:url`, sitemap absolute URLs, and a `Sitemap` robots directive.
- Add real Search Console, Bing Webmaster Tools, or analytics verification IDs only through environment variables.
- Measure Core Web Vitals on the production origin; this repository does not claim performance scores.
- Add OCR before marketing scanned-PDF support. Retrieval is hybrid (Postgres full-text + pgvector, merged with RRF) but has no measured accuracy evaluation yet, so do not publish accuracy numbers.
- Add rate limiting, email verification, password reset, and account deletion before treating auth as a production identity system.
