# Quranly 0.1.0 Alpha for Windows

Quran reading, recitations, memorization, daily azkar and progress tracking. Every app feature is free. The original full-screen player UI and animated backgrounds are restored: Dark Veil, Liquid Ether, Prism and Acid Squares, plus Off. All background and accent choices are free and saved between sessions. The original blue-to-black app background is restored. Desktop navigation, seek and volume controls, offline downloads and keyboard controls remain available.

## Install

Run `Quranly-Setup-0.1.0-alpha-x64.exe` and follow the current-user setup. The installer is unsigned. Saved audio and preferences remain in the Windows user profile.

## Accounts and cloud progress

The live Quranly Supabase project is connected in the selected organization. Supabase handles email/password sign-in, registration, email verification, password recovery, profile names, private progress and feedback. Firebase and payment integrations have been removed.

Use Settings to sign in or register. When registration asks for confirmation, copy the confirmation link from the Supabase email and paste it into the app. If you already opened it and your browser shows a localhost error, copy the entire browser address (including everything after #) and paste that instead. Never share that address: it contains account credentials. Expired or incomplete links show an actionable error; use Resend confirmation email for a fresh link. Password recovery uses the same in-app link flow, followed by choosing a new password. Google login is not offered in this alpha.

Reading and listening also work without an account. Guest progress and each signed-in account have separate local snapshots. Cloud progress is private to its owner. Community rankings are optional: joining shares only a chosen alias, listening minutes, streak and XP with signed-in users; leaving removes that record. Group khatm records currently sync within an account, without multi-user invitations.

Two temporary accounts verified live sign-in, profile edits, progress storage and account switching. Database checks confirmed that one account cannot access another account's progress or feedback, and anonymous access is denied. Test accounts were removed after verification. Confirmation and recovery email delivery have not been tested end to end; configure production SMTP in Supabase before a public rollout.

## Development

Use Node.js 22 or newer and Windows x64.

```powershell
npm ci
Copy-Item .env.example .env.desktop.local
# Fill in your Supabase URL and publishable key in .env.desktop.local.
npm run build:desktop
npm run desktop
npm run dist:win
```

The installer is created in `release/`. Do not rebuild `dist` while packaging. Web development uses `npm run dev`; web builds retain the `/quranly/` base. Desktop runs from the secure local `quranly://app` origin without a development server.

`.env.local` and `.env.desktop.local` contain only the client Supabase URL and publishable key. See `.env.example`. Never place a secret or service-role key in Vite environment variables. The database schema and ownership policies are in `supabase/schema.sql` and have been applied to the connected project.

Supabase's security advisor recommends enabling [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) in the project authentication settings.

## AI and online content

Source search works without an API key. AI answers use a personal Gemini API key, model discovery, source citations, cancellation, retries and local conversation history scoped to the signed-in account. Provider usage charges may apply. Model responses and quota recovery were tested with controlled API fixtures; a paid live model request was not made. Live Quran search, Tafsir and Arabic-page endpoints were checked successfully. New audio, catalogs and online content require connectivity; downloaded recitations can play offline. Prayer alerts require opt-in and run while the app is open.

## Verification

```powershell
npm test
npm run test:desktop
npm run lint
npm run build:desktop
node tests/packaged-smoke.cjs
```

Checks cover local protocol security, all 13 app screens, navigation, preferences, free downloads, desktop player controls, both themes and actual cached audio playback with external requests blocked. An optional live Supabase test uses temporary fixtures supplied through `QURANLY_LIVE_AUTH_FIXTURES`. The packaged executable is checked separately for the alpha version, startup and renderer isolation.

Existing lint warnings remain, mainly unused variables and hook dependencies. This is an alpha release.

## UI and feature update

- Full-screen seeking uses a native slider with visible elapsed and remaining tracks and keyboard control. Downloads support cancellation.
- AI chat stays above the playback bar, including smaller desktop windows. Keys are validated through model discovery and never placed in request URLs.
- Listening progress uses local dates and real playback time, excluding pauses, seeks and stalls. Empty days use neutral indicators. Goals can be edited with the keyboard.
- Custom playlists can be created, renamed and searched when adding surahs. Offline collections preserve the downloaded reciter.
- Quran pages and practice surahs are cached for offline revisits. Outdated page requests are cancelled. Reading position and memorization review sync as private account progress.
- Windows memorization uses manual verse review, hints and audio. Browser speech matching is approximate; it is not a Tajweed assessment.
- Azkar repetition counts survive navigation and are separated by account and local day. Backups export only the current account's progress and preferences.
- The opt-in community schema is in `supabase/community.sql`. Its ownership and access policies passed live database checks.

Gemini API reference: https://ai.google.dev/api/models and https://ai.google.dev/api/generate-content

## Uniform liquid glass

Cards, navigation, playback controls, chat and dialogs now share one liquid-glass material with matching tint, blur, specular edges and surface radii. Dialogs use a denser tint for readability. Original accent colors and animated backgrounds remain. Light and dark materials are separate; reduced transparency uses solid surfaces. Desktop CSS targets the Windows renderer so backdrop blur remains present in the packaged build.

## Project and build location

Live authentication update (18 October 2026): email confirmation is disabled at the owner's request. New email/password accounts sign in immediately without an email link; existing users should choose Sign in. This server change requires no reinstall. Password reset still uses email and needs a production sender for reliable delivery. A temporary live account passed signup and password login checks and was removed afterward. The confirmation-link instructions above apply only if confirmation is enabled again.

The source project is on the Desktop in `quranly pc`. Run `npm run dist:win` there to produce `release/Quranly-Setup-0.1.0-alpha-x64.exe`. A successful build automatically removes installers for older versions from `release`; source files and user data are retained. Installers for the same version are replaced in place.
## Automatic account backup and resume

Signed-in accounts now back up favourites, followed reciters, playlists, verse bookmarks, reflections, daily goals, listening history, reciter play counts and listening analytics, recent reciters, reading page and memorization progress automatically to Supabase. Playback resume includes the surah, exact saved position, reciter/riwayah, queue, volume, speed, repeat and shuffle. Restored playback starts paused; press Play to continue.

Library edits are debounced; playback checkpoints save locally every five seconds and upload about every fifteen seconds, on pause/seeking, and when the app becomes visible or reconnects. Closing abruptly can lose the last few seconds of a checkpoint. The account's persistent outbox survives restarts and retries failed uploads. Pending local fields take precedence over older cloud data. Other devices are refreshed while the app is running. If the same collection is edited concurrently on two devices, the last uploaded version of that field wins; this is account backup and resume, not remote control of another device's player.

Settings → Your data shows restoring, queued, saving, backed up or retry status. Backups remain private to the signed-in account. Local snapshots, outboxes and analytics are separated by account. Downloaded audio stays on the device; files, Gemini keys and private AI conversations are not uploaded by this backup.

Verification includes an offline restart, restoration in a fresh app profile, accurate play counting only after playback begins, and live Supabase backup/restore and ownership checks with disposable accounts. Test accounts were removed.

The Quran reader now has a compact responsive toolbar, a consistent glass reading surface, calmer Arabic spacing, keyboard verse actions, and labelled text-size controls with a reset. Original app and player colours remain.


## Reciter collection downloads - 0.1.0-alpha.1

Open Downloads, choose a reciter, or use Download collection on a reciter profile. Select the recording and Original, 128 kbps or 64 kbps MP3. Check storage before starting. The queue includes every surah listed for the selected recording, including all 114 for complete recordings; a partial recording is labelled with its actual available count.

Original keeps the server recording unchanged. Other settings download the original first and convert it locally with bundled FFmpeg; they reduce saved file size when the source bitrate is higher, without improving source quality. Storage checks show source download bytes and free disk space. Missing server sizes are estimated; conversion reserves extra working space, and actual saved size depends on duration.

Collection audio and the queue are stored in the existing Windows app profile under `audio-collections/`, separate from account backup and existing browser-cache downloads. Downloads run sequentially while Quranly is open. Pause keeps completed surahs and the partial current file. Closing/restarting restores unfinished queues paused: choose Resume to continue. Servers supporting Range and a file validator resume from saved bytes; other servers safely restart the current file. Network failures retry three times and leave a recoverable queue. Remove collection removes that collection's audio and partial files while retaining other downloads and user progress.

Completed surahs appear in Downloads and play without a network connection, including seeking. Collections work without an account; no new backend is used. Engine attribution and source references are in AUDIO-ENGINE-NOTICES.md and bundled alongside FFmpeg.

`npm test` covers complete 114-surah queues, storage estimates, restart/range recovery, safe server fallback, retry preservation and real 64/128 kbps conversion. `npx playwright test tests/collections.spec.js` covers controls, pause/restart/resume and offline playback. Set `QURANLY_PACKAGED=1` to test the packaged executable after building.
