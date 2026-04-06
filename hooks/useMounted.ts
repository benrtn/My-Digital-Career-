'use client'

import { useEffect, useState } from 'react'

/** Returns true only after the component has mounted on the client.
 *  Use this to prevent Framer Motion opacity:0 from persisting on SSR. */
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
