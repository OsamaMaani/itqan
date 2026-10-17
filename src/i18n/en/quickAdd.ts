export const quickAdd = {
  /** Input placeholder. {example} is `quickAdd.example` below. */
  placeholder: 'Add a task…  try “{example}”',
  /**
   * An example task for the quick-add input, parsed by quick add — so it must be a real task in this
   * language: use this language's quick-add words from src/i18n/quickAddWords.ts (a day word such as
   * "tomorrow", a priority !2) and the name of an area from the starter set (m.seed.areas) after the #.
   */
  example: 'Read 20 pages #books tomorrow !2',
  /** Shown as #area in the syntax hint: the word for "area" after the # sign. */
  areaToken: 'area',
  /** Shown as +project in the syntax hint: the word for "project" after the + sign. */
  projectToken: 'project',
  /**
   * Syntax hint under the input. {area} and {project} are the words above, {days} three day words
   * joined with "/", {time} a time-of-day example such as @morning, {estimate} an estimate such as ~30m.
   */
  hint: '#{area} · +{project} · !1–3 · {days} · {time} · {estimate}',
}
