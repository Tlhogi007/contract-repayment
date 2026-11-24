/**
 * Semantic Release — versions and changelogs from conventional commits.
 * Releases publish from `main` only. `develop` is the integration branch.
 *
 * We do not use `@semantic-release/git` because `main` is PR-protected and
 * the Actions token cannot push release bumps. GitHub Releases + tags are
 * the source of truth; CHANGELOG.md is generated in CI artifacts via notes.
 */
module.exports = {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: ['CHANGELOG.md'],
      },
    ],
  ],
};
