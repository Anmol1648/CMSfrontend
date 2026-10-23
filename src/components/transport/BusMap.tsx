"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { transportApi } from "@/lib/api/transport";
import type { MapProps } from "./LeafletMap";

export type { MapLine, MapMarker, MapProps } from "./LeafletMap";

/** Leaflet, loaded only in the browser (it needs `window`). */
const LeafletMap = dynamic<MapProps>(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full rounded-2xl bg-surface-container-low animate-pulse" />,
});

/** The map, with the school's tiles (Google Maps with its key, else OpenStreetMap). */
export function BusMap(props: Omit<MapProps, "tiles">) {
  const tiles = useQuery({ queryKey: ["transport", "map-tiles"], queryFn: transportApi.map, staleTime: 60 * 60_000, retry: false });
  return (
    <>
      <LeafletMap {...props} tiles={tiles.data} />
      {tiles.data?.note && <p className="mt-2 text-xs text-amber-800">{tiles.data.note}</p>}
    </>
  );
}
