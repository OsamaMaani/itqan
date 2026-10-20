/**
 * The English catalog — the source every translation is checked against (ADR-024).
 * One file per screen or area. Placeholders are {name}; counts use plural objects.
 */
import { achievements } from './achievements'
import { palette } from './palette'
import { quickAdd } from './quickAdd'
import { tasks } from './tasks'
import { plan } from './plan'
import { focus } from './focus'
import { goals } from './goals'
import { insights } from './insights'
import { review } from './review'
import { projects } from './projects'
import { ideas } from './ideas'
import { memories } from './memories'
import { settings } from './settings'
import { sync } from './sync'
import { onboarding } from './onboarding'
import { daily } from './daily'
import { app } from './app'
import { common } from './common'
import { errors } from './errors'
import { connections } from './connections'
import { badges, levels } from './game'
import { gym } from './gym'
import { habits } from './habits'
import { nav } from './nav'
import { reminders } from './reminders'
import { seed } from './seed'
import { store } from './store'
import { time } from './time'
import { today } from './today'
import { training } from './training'
import { workout } from './workout'

export const en = {
  common, nav, time, app, levels, badges, today, palette, quickAdd, tasks, plan, focus, habits, goals, insights, review,
  projects, ideas, memories, achievements, reminders, connections, settings, sync, onboarding, daily, seed, store, errors,
  gym, training, workout,
}
