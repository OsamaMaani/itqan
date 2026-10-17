/**
 * The Spanish catalog (ADR-024), one file per screen like the English source. Written to
 * memory/10-localization.md (Part 2 "Español" and the glossary in Part 3): tú, infinitive
 * buttons, opening ¿ and ¡, «» quotes, neutral international Spanish.
 */
import type { Messages } from '../core'
import { achievements } from './achievements'
import { app } from './app'
import { common } from './common'
import { connections } from './connections'
import { daily } from './daily'
import { errors } from './errors'
import { focus } from './focus'
import { badges, levels } from './game'
import { goals } from './goals'
import { habits } from './habits'
import { ideas } from './ideas'
import { insights } from './insights'
import { memories } from './memories'
import { nav } from './nav'
import { onboarding } from './onboarding'
import { palette } from './palette'
import { plan } from './plan'
import { projects } from './projects'
import { quickAdd } from './quickAdd'
import { reminders } from './reminders'
import { review } from './review'
import { seed } from './seed'
import { settings } from './settings'
import { store } from './store'
import { sync } from './sync'
import { tasks } from './tasks'
import { time } from './time'
import { today } from './today'

export const messages: Messages = {
  common, nav, time, app, levels, badges, today, palette, quickAdd, tasks, plan, focus, habits, goals, insights, review,
  projects, ideas, memories, achievements, reminders, connections, settings, sync, onboarding, daily, seed, store, errors,
}
