# Changesets

Each app and package versions on its own. A change that affects what ships (an app, or `packages/shared-*`) needs a
changeset: run `npm run changeset`, pick the packages and the bump (major/minor/patch), and commit the generated file.
A change to `shared-types` or `shared-validation` is a contract change: it also affects every app that consumes it.

`npm run version-packages` applies the pending changesets (bumps versions, writes each `CHANGELOG.md`).
