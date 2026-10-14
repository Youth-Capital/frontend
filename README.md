# Youth Capital frontend

React/TypeScript and Vite, served as static files by an unprivileged Nginx container. The production API uses the existing same-origin `/api/v1` default.

## Develop and check

Use Node `24.21.0` from `.node-version`:

```sh
npm ci
npm run dev
npm test
npm run build
node --test .github/scripts/release.test.mjs
```

`npm test` runs TypeScript, locale and contrast checks. It explicitly reports that no application unit-test suite exists yet. The release-helper tests cover registry retention, commit conflicts, deployment retries and stale-release protection.

## Build and release

```sh
docker build -t youthcapital-frontend:local .
docker run --rm --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop ALL --security-opt no-new-privileges \
  -p 127.0.0.1:8080:8080 youthcapital-frontend:local
```

The image uses pinned bases, installs current Alpine security patches in its runtime stage and runs as UID/GID `101:101`. Hashed assets are immutable; HTML and unhashed public files are revalidated. The container provides `/healthz` and SPA fallback. Caddy in infra owns TLS, HTTP/3 and API routing.

The `CI and release` workflow runs three parallel security gates, tests, build/publish, image scanning, infra handoff and cleanup. PRs receive no production credentials. Main releases use the `prod` environment. Store only `INFRA_APP_PRIVATE_KEY` as a secret, and `INFRA_APP_ID` / `INFRA_REPO=Youth-Capital/infra` as variables here. The GitHub App is installed only on infra with Contents and Actions read/write access.

For first package creation, manually run the workflow with `publish_only=true`, grant infra Read under that package's Manage Actions access, then run a full release with the option disabled. Every deployment reference contains a unique release tag and image digest. Rerunning only deploy reuses its existing image; failed deployments skip final cleanup. Manual `Registry maintenance` can prune accumulated versions without rebuilding. Prepublish/maintenance preserves the newest two releases and infra's desired digest; final cleanup keeps the new release and the previous publication. Stale retries cannot delete newer images or rewind infra.

Runtime secrets and VPS credentials belong exclusively in infra/prod. `VITE_*` values are public build-time values, so never put secrets there. See the [infra setup and operations guide](https://github.com/Youth-Capital/infra/blob/main/README.md) for deploy-user SSH setup, bootstrap, all environment settings and recovery.
