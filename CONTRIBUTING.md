# Contributing

Thanks for helping. The most common fix is updating a selector after YouTube changes its pages.

## When something reappears on YouTube

1. Open the YouTube page, right-click the thing that should be hidden, and choose **Inspect**.
2. Find the nearest element with a stable name, usually one starting with `ytd-` or `ytp-`, or an `id`.
3. Add or update the rule in [`src/content.css`](src/content.css), under the right feature's attribute (for example `html[data-ytf-related]`).
4. If you changed the page structure the tests rely on, update the saved copy in [`test/fixtures/`](test/fixtures) to match.
5. Run the checks:

   ```sh
   npm run typecheck
   npm test
   npm run test:e2e
   npm run test:live
   ```

6. Open a pull request saying what changed on YouTube. A screenshot helps.

## Adding a feature

Keep the extension small and private:

- No new permissions without a strong reason.
- No network requests, analytics, or remote code.
- Every new option needs a default in `src/settings.ts`, handling in `normalize`, and a test.

## Releasing

1. Update the version in both `package.json` and `src/manifest.json`. The build checks they match.
2. Add the changes to `CHANGELOG.md`.
3. Run `npm run test:live`, then `npm run zip`.
4. Tag the release (`git tag v0.2.0`) and attach the zip to a GitHub release.
