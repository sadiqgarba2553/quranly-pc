# App-owned releases

Update package/product versions, `release.config.json` and release notes before building. Published assets are immutable; choose a new version for changed binaries. Source and assets belong only in this app repository, never in the website repository.

Run `npm ci`, the app tests, `npm run dist:win`, the packaged smoke check, and `node tools/package-zip.mjs`. See `WINDOWS-SIGNING.md`. The app-owned Windows workflow performs fresh build and validation before publication.

Commit and push the exact source to this repository, then run `node tools/release.mjs prepare` and `node tools/release.mjs publish` with Git credentials, or dispatch the Windows workflow where available. The publisher checks repository ownership, source commit and file hashes. Private signing keys never enter source archives or release assets.

After every planned app release is public, build, verify and promote the signed feed from the Launcher repository. Website deployment is separate.
