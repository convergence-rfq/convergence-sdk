# Convergence RFQ JavaScript SDK MONOREPO Details

### Building convergence

`nx run packagename:command`

f.e.
`nx run packages/js:build`

or run all targets
`nx run-many --all --target=build --skip-nx-cache`

`nx run packages/js:test`

run only affected targets

`run nx affected --target=test`

## Releases

The CI server will deal with releasing and publishing.

When the packages modules need to be updated [changesets](https://github.com/changesets/changesets) are used to manage bumping versions.

- `yarn changeset add` follow the instructions, normally it should be selecting all libraries that have had a code change.
- Use the correct bump type, usually `patch` or `minor`

To prepare for a release and publish run `yarn changeset version` to update the version in the all the packages that have changed.
