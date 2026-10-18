# Quranly Windows launch preparation

Current release: **0.1.0 Alpha**. Source: Desktop / quranly pc. Installer: release / Quranly-Setup-0.1.0-alpha-x64.exe.

## Email confirmation setting

Email confirmation was disabled in the live Supabase project on 18 October 2026 at the owner's request because email delivery was blocking signup. New users receive a session immediately after email/password registration. This is a server setting and requires no app reinstall. Password authentication and private progress access policies remain enabled. Email address ownership is no longer checked at signup.

A temporary live account verified immediate signup and subsequent password sign-in. Its sessions were signed out and the account was deleted. There are no pending unconfirmed email accounts. Existing users should sign in rather than register again. The app retains confirmation-link support if confirmation is re-enabled later; password recovery still uses email.

## Remaining public launch checks

- Configure a production email sender/SMTP in Supabase and verify password recovery delivery. Turning off signup confirmation does not fix email delivery or password-reset emails. A branded browser callback is still desirable.
- Enable Supabase leaked password protection if supported by the project plan: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Sign the Windows installer with the publisher's code-signing certificate. This alpha is unsigned.
- Review privacy policy, support contact, and distribution page before publishing. Personal Gemini keys and provider billing remain separate from Quranly's free app features.

## Build maintenance

Use `npm run dist:win`. It builds first, then removes older installers from this project's release folder. Do not delete source code, `.env` configuration, downloads, or Windows profile data when replacing an installer. Keep only the latest verified installer when copying releases elsewhere.

## Automatic backup update

Automatic private account backup and playback resume have passed live Supabase and Windows app checks. Offline changes queue locally across restarts. Favourites, playlists, reading state, personal listening analytics and the saved player position are restored after sign-in. See WINDOWS.md for timing, per-device audio downloads and concurrent-edit behaviour. The reader toolbar and text layout were also updated for desktop and smaller windows.
