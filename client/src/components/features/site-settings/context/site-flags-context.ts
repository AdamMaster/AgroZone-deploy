'use client'

import { createContext } from 'react'

import { DEFAULT_SITE_FLAGS } from '../constants/site-flags.constants'
import { SiteFlags } from '../types/site-settings.types'

export const SiteFlagsContext = createContext<SiteFlags>(DEFAULT_SITE_FLAGS)
