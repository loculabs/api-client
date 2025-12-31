# Contributing

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to automate versioning and changelog generation via [semantic-release](https://semantic-release.gitbook.io/).

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `fix` | Bug fixes | Patch (1.0.0 → 1.0.1) |
| `feat` | New features | Minor (1.0.0 → 1.1.0) |
| `docs` | Documentation only | None |
| `style` | Code style (formatting, semicolons) | None |
| `refactor` | Code change that neither fixes a bug nor adds a feature | None |
| `perf` | Performance improvement | None |
| `test` | Adding or updating tests | None |
| `chore` | Maintenance tasks | None |

### Breaking Changes

Breaking changes trigger a **major** version bump (1.0.0 → 2.0.0).

**Option 1:** Add `!` after the type:
```
feat!: remove deprecated API endpoints
```

**Option 2:** Add `BREAKING CHANGE:` in the footer:
```
feat: redesign authentication flow

BREAKING CHANGE: JWT tokens now expire after 1 hour instead of 24 hours
```

### Examples

```bash
# Patch release
git commit -m "fix: resolve null pointer in parser"

# Minor release
git commit -m "feat: add support for webhooks"

# Major release
git commit -m "feat!: change API response format"

# No release (docs only)
git commit -m "docs: update README installation instructions"

# With scope
git commit -m "fix(auth): handle expired refresh tokens"
```

### What triggers a release?

Only commits with `fix:`, `feat:`, or breaking changes will trigger a new npm release. Other types (`docs`, `chore`, `test`, etc.) will not create a release on their own.
