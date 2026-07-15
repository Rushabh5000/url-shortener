"use client";

import { useEffect, useRef } from "react";

// React sanitizes javascript: URLs passed via the href prop as an XSS
// precaution, which breaks bookmarklets. Setting the attribute directly via
// the DOM sidesteps that check for this deliberate, static, non-user-input case.
export function BookmarkletLink({ href, children }: { href: string; children: React.ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    ref.current?.setAttribute("href", href);
  }, [href]);

  return (
    <a ref={ref} className="btn-ghost shrink-0 text-xs" draggable>
      {children}
    </a>
  );
}
