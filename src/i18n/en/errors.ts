/** Errors shown when a backup or sync goes wrong. Say what happened and what to do next. */
export const errors = {
  notJson: 'That file is not valid JSON.',
  notBackup: 'That file is not an Itqan backup.',
  newerBackup: 'This backup is from a newer version of Itqan. Update the app first.',
  /** {field} is the name of a missing part of the file, e.g. "tasks". */
  damagedBackup: 'The backup is damaged: "{field}" is missing.',
  wrongPassphrase: 'Wrong passphrase — it does not match the one used on your other device.',
  syncNotJson: 'The sync file is damaged (not JSON).',
  syncNotItqan: 'The sync file is not an Itqan sync file.',
  syncShape: 'The sync file has an unexpected shape.',
  syncNewer: 'Your other device runs a newer Itqan. Update this one first (on the laptop: run install_local.sh).',
  syncSettle: 'Could not settle with the other device; will retry shortly.',
  syncRepoFile: 'The repository has an itqan-sync.json that is not an Itqan sync file.',
  offline: 'Offline — will sync when the connection is back.',
  tokenRejected: 'GitHub rejected the token. Check that you copied all of it and it has not expired.',
  /** {repo} is owner/name of a GitHub repository. */
  cantSeeRepo: 'Can’t see {repo}. Check the names, and that the token was given access to this repository.',
  /** {status} is an HTTP status code like 500. */
  githubStatus: 'GitHub answered {status}.',
  githubStatusReading: 'GitHub answered {status} while reading.',
  githubStatusSaving: 'GitHub answered {status} while saving.',
  repoPublic: '{repo} is public. Make it private first — your data must not sit in a public repository, even encrypted.',
  tokenReadOnly: 'The token can read but not write. Give it “Contents: Read and write”.',
  tokenExpired: 'GitHub rejected the token — it may have expired. Create a new one and reconnect.',
  changedElsewhere: 'Changed on another device meanwhile.',
  tokenCantWrite: 'The token can’t write to the repository. Give it “Contents: Read and write”.',
}
