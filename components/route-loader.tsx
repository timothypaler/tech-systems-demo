"use client";

import { useEffect, useState } from "react";

const TRANSITION_MS = 850;

export function RouteLoader() {
  const [loading, setLoading] = useState(false);
  const [booting,setBooting]=useState(true);

  useEffect(() => {
    const bootTimer=window.setTimeout(()=>setBooting(false),TRANSITION_MS);
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey
      ) return;

      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const current = new URL(window.location.href);
      const sameDocument = destination.pathname === current.pathname &&
        destination.search === current.search && destination.hash;
      if (sameDocument || destination.href === current.href) return;

      event.preventDefault();
      setLoading(true);
      window.setTimeout(() => window.location.assign(destination.href), TRANSITION_MS);
    };

    document.addEventListener("click", handleClick, true);
    return () => {window.clearTimeout(bootTimer);document.removeEventListener("click", handleClick, true);};
  }, []);

  const visible=loading||booting;

  return (
    <div className={`route-loader ${visible ? "is-visible" : ""}`} role="status" aria-live="polite" aria-hidden={!visible}>
      <div className="route-loader-wordmark"><strong>TECH <span>SYSTEMS</span></strong><small>COMPUTERS · SECURITY · NETWORKS</small></div>
      <div className="route-loader-track" aria-hidden="true">
        <div className="route-loader-walker">
          <div className="route-loader-mascot">
            <span aria-hidden="true">TS</span>
            <i className="route-loader-leg leg-left" />
            <i className="route-loader-leg leg-right" />
          </div>
        </div>
      </div>
    </div>
  );
}
