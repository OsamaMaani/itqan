export const sync = {
  /** How long ago the last sync was; fills {ago} in the messages below. */

  badge: {
    /** {error} is a message already in the interface language. */
    problem: 'Sync problem: {error}',
    offline: 'Offline — will sync when back online',
    /** {ago} is a phrase like “5 minutes ago”. */
    synced: 'Synced {ago}',
    syncing: 'Syncing…',
  },

  panel: {
    title: 'Sync between devices',
    /** {repo} is bold text: “private GitHub repository”. */
    intro: 'Use Itqan on your laptop and iPhone with the same data. Your data is encrypted with a passphrase on this device, then kept in a {repo} — free, and unreadable to anyone without the passphrase.',
    introRepo: 'private GitHub repository',
    setUp: 'Set up sync',
    /** {ago} is a phrase like “5 minutes ago”. */
    lastSynced: 'Last synced {ago}',
    notSynced: 'Not synced yet',
    hint: 'Syncs when you open Itqan, a few seconds after each change, and every minute while it is open.',
    syncNow: 'Sync now',
    turnOff: 'Turn off on this device',
    turnOffConfirm: 'Stop syncing on this device? Your data stays here and on GitHub.',
    turnedOff: 'Sync turned off on this device',
  },

  setup: {
    /** {step} is 1 or 2, {total} is 2. */
    title: 'Set up sync · {step} of {total}',
    checking: 'Checking…',
    continue: 'Continue',
    connect: 'Connect',
    connecting: 'Connecting…',
    step1Body: 'Itqan stores your data in a private GitHub repository you own. You need the repository and a token that can only touch it.',
    username: 'GitHub username',
    usernamePlaceholder: 'your-username',
    repository: 'Private repository',
    token: 'Access token',
    tokenHint: 'stored only on this device',
    showHelp: 'How do I get these?',
    hideHelp: 'Hide',
    /** The numbered instructions for creating the repository and token. {…} are bold text, code or links. */
    help: {
      create: 'Create a {private} repository named {repo} at {link}.',
      private: 'private',
      openToken: 'Open {link}.',
      tokenLink: 'a new fine-grained token',
      access: 'Repository access: {only} → {repo}.',
      onlySelect: 'Only select repositories',
      permissions: 'Permissions → Repository → {contents}. Nothing else.',
      contents: 'Contents: Read and write',
      paste: 'Generate, copy it, paste it here. Do the same paste on your other device.',
    },
    foundData: 'Found your synced data. Enter the passphrase you chose on your other device.',
    /** {warning} is bold text: the sentence that tells the person to write the passphrase down. */
    firstDevice: 'This is your first device. Choose a passphrase — it encrypts everything before it leaves this device. {warning} (your devices keep their own copies).',
    firstDeviceWarning: 'Write it down: without it, the synced copy cannot be read',
    passphrase: 'Passphrase',
    passphraseHint: 'at least 8 characters',
    repeat: 'Repeat it',
    hasData: 'This device already has data',
    merge: 'Merge it with the synced data',
    mergeBody: 'Keeps everything from both. Right for your main device.',
    replace: 'Replace it with the synced data',
    replaceBody: 'Discards this device’s data (nothing is deleted elsewhere). Right for a new device.',
    mismatch: 'The two passphrases are different.',
    connectedExisting: 'Connected — your data is syncing',
    connectedNew: 'Sync is on. Now connect your other device.',
  },
}
