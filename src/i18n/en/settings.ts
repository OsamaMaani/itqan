export const settings = {
  title: 'Settings',
  subtitle: 'Make Itqan yours.',

  profile: {
    title: 'Profile',
    language: 'Interface language',
    /** Shown under the language picker. The language names themselves are never translated. */
    languageHint: 'With sync on, your language follows you to your other devices.',
    name: 'Your name',
    namePlaceholder: 'Shown in the greeting',
    theme: 'Theme',
    themes: { system: 'System', light: 'Light', dark: 'Dark' },
    weekStartsOn: 'Week starts on',
    /** Training (ADR-027): how weights are shown. */
    weightUnit: 'Weights in',
    weightUnitHint: 'switching never changes what you logged',
    focusMinutes: 'Focus (min)',
    breakMinutes: 'Break (min)',
    sounds: 'Sounds',
    showHijri: 'Show Hijri date',
  },

  daily: {
    title: 'Daily card',
    body: 'One of each a day on Today, the same on all your devices. On a phone it stays folded to one line until you open it.',
    verse: 'Verse of the Quran',
    hadith: 'Hadith',
    word: 'Word of the day',
    wisdom: 'Wisdom',
    fact: 'Fact',
    /** Under a verse or hadith, the meaning is shown in the interface language. */
    meaning: 'Show the meaning under the Arabic',
    wordLanguage: 'Word of the day — language',
    level: 'Level',
    /** CEFR levels A1–C2 are codes and stay as they are. {level} is the code, {name} its description. */
    levelLine: '{level} — {name}',
    /** {level} is a CEFR code, {hsk} the matching HSK level, e.g. “HSK 3”. */
    chineseHsk: 'Chinese uses HSK: {level} ≈ {hsk}',
    levelNames: { A1: 'beginner', A2: 'elementary', B1: 'intermediate', B2: 'upper intermediate', C1: 'advanced', C2: 'mastery' },
  },

  /** Settings → Notifications (ADR-031). Each device keeps its own choices. */
  notifications: {
    title: 'Notifications',
    body: 'What Itqan tells you about on this device. Each device keeps its own choices.',
    test: 'Send a test',
    helperOn: 'On this laptop, alerts come from Itqan’s desktop helper — even when Itqan is closed. There is nothing to allow.',
    /** {script} is a file path to a script. */
    helperOff: 'The desktop helper isn’t running, so alerts show only while Itqan is open. Run {script} once to fix it.',
    helperChecking: 'Connecting to the desktop helper…',
    allowed: 'Allowed on this device.',
    askOnce: 'Allow once — Itqan remembers it and won’t ask again.',
    allow: 'Allow notifications',
    blocked: 'Blocked in this browser’s settings. Allow notifications for Itqan there, then come back.',
    unsupported: 'This browser can’t show notifications — alerts show inside Itqan while it is open.',
    /** iOS wording: the Share button and its “Add to Home Screen” item. */
    homeScreen: 'On iPhone, notifications work only in the Home Screen app: tap Share, then “Add to Home Screen”, and open Itqan from there.',
    on: 'Notifications on this device',
    timer: 'Focus and break endings',
    reminders: 'Reminders',
    checkIns: 'Check-ins with people',
    /** A switch on a phone: the laptop pushes its focus/break endings to this device. */
    fromLaptop: 'Alerts from my laptop',
    fromLaptopHint: 'When a focus session or break you started on the laptop ends, this device is told too. The laptop sends it, so it needs to be awake.',
    needsSync: 'This needs sync, so your laptop learns about this device — set it up below.',
    enabled: 'This device will get your laptop’s alerts',
    denied: 'Notifications are blocked for Itqan on this device',
    failed: 'Couldn’t turn it on — check your connection and try again',
    devicesTitle: 'Devices that get your laptop’s alerts',
    /** {date} is the date the device was added. */
    added: 'added {date}',
    thisDevice: 'this device',
    /** {name} is the label of the switch (fromLaptop). */
    noDevices: 'None yet. On your phone, open Itqan from the Home Screen, go to Settings → Notifications and turn on “{name}”.',
    remove: 'Remove',
    removed: 'Removed — it won’t get alerts any more',
    testSent: 'Sent — it should arrive in a few seconds',
    testFailed: 'Couldn’t send — is the desktop helper running?',
    /** {script} is a file path to a script. */
    helperOld: 'Run {script} once more so the helper can send to your other devices.',
  },

  areas: {
    title: 'Areas of life',
    add: 'Add area',
    body: 'Areas group your tasks, habits, goals and focus time — and power the balance chart in Insights.',
    edit: 'Edit area',
    editTitle: 'Edit area',
    newTitle: 'New area',
    namePlaceholder: 'e.g. Arabic poetry',
    colour: 'Colour',
    colours: {
      emerald: 'Emerald', teal: 'Teal', sky: 'Sky', indigo: 'Indigo', violet: 'Violet',
      rose: 'Rose', amber: 'Amber', orange: 'Orange', lime: 'Lime', slate: 'Slate',
    },
    /** {name} is the area’s name. */
    deleteConfirm: 'Delete “{name}”? Its tasks, habits and goals are kept, just without an area.',
  },

  /** Counts of things; used in each area’s summary and in the restore confirmation. */
  counts: {
    tasks: { one: '{n} task', other: '{n} tasks' },
    habits: { one: '{n} habit', other: '{n} habits' },
    goals: { one: '{n} goal', other: '{n} goals' },
  },

  data: {
    title: 'Your data',
    /** {warning} is bold text: the sentence’s key warning. */
    intro: 'Everything is stored privately in this browser — no account, no server. That also means {warning}, so download a backup now and then.',
    warning: 'clearing browser data deletes it',
    /** {date} is the date of the last backup. */
    lastBackup: 'Last backup: {date}.',
    noBackup: 'You have not made a backup yet.',
    download: 'Download backup',
    restore: 'Restore from backup',
    deleteAll: 'Delete everything',
    backupDownloaded: 'Backup downloaded',
    backupRestored: 'Backup restored',
    /** {tasks}, {habits} and {goals} are counts already written out, e.g. “12 tasks”. */
    restoreConfirm: 'Replace everything in Itqan with this backup ({tasks}, {habits}, {goals})?',
    /** {word} is the typed-confirmation word (deleteWord); the prompt must tell the person to type exactly that word. */
    deleteAllPrompt: 'This deletes everything — and, if sync is on, on your other devices too. Type {word} to confirm.',
    /** The word the person types to confirm deleting everything. Keep it short and easy to type. */
    deleteWord: 'DELETE',
    deleted: 'All data deleted',
  },

  shortcuts: {
    title: 'Shortcuts',
    commandBar: 'Command bar: add tasks, jump anywhere',
    newTask: 'New task',
    /** {pages} is a list of screen names. */
    goTo: 'Go to {pages}',
    closeDialog: 'Close a dialog',
    /** {addToHome} is the name of a phone browser menu item, in italics. */
    install: 'Install Itqan as an app: in Chrome or Edge, use the install icon in the address bar. On a phone, use {addToHome}. It then works offline.',
    addToHome: 'Add to Home screen',
  },
}
