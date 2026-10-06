"use client";

import { useEffect } from "react";

/** Tells the server the browser's timezone so "today" is correct. */
export default function TzCookie() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && !document.cookie.includes(`tz=${encodeURIComponent(tz)}`))
      document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return null;
}
