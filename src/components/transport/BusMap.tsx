"use client";

import dynamic from "next/dynamic";
import type { MapProps } from "./LeafletMap";

export type { MapLine, MapMarker, MapProps } from "./LeafletMap";

/** The map, loaded only in the browser (Leaflet needs `window`). */
export const BusMap = dynamic<MapProps>(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full rounded-2xl bg-surface-container-low animate-pulse" />,
});
