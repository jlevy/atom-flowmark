# Contributing

Contributions are most welcome!
We use this heavily at [Holloway](https://www.holloway.com/) but I don’t have much time to
maintain it. (These are my own dev notes so I don’t have to remember all the commands.)

## Developing

```sh
# Clone the project.
git clone …
# Install dependencies.
npm install
```

## Testing

```sh
npm test
```

Tests are partially automated: `npm test` checks code-style and whether Flowmark
does things.

Tests will pass if *something* happened, you still need to manually review the
changes carefully (`git diff`).

Only change `testdoc.orig.md` or code, but never both at once in a commit.
This allows careful review of formatting behavior changes.

## Developing

To try out your local changes to Flowmark manually, make sure that your have
your local version of Flowmark in Atom:

```sh
# Uninstall if it's installed already.
apm remove flowmark
# Use local.
apm link
```

After that, use Reload Window (Ctrl-Cmd-Option-L) to reload all of Atom and activate
plugin.

## Publishing

Usual Atom publishing methods:

```bash
apm publish patch
apm publish minor
```

This does a local commit to package.json, a local tag, pushes to GitHub, and then sends to
Atom registry.
Note that if something goes wrong, like auth isn’t set up right (on the git http/ssh repo
listed in package.json) it fails in a painful way because it has done the local commit and
tag, but then fails.
So you need to `git reset --hard` and `git tag -d` the new tag and start again.
Using ssh auth now as that works more reliably for me.
