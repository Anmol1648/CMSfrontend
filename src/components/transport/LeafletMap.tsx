"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * A map on OpenStreetMap tiles (Leaflet). Loaded only in the browser (see BusMap). Draws lines
 * (route paths) and markers (buses, stops, school); clicking the map can place something.
 */

export interface MapLine {
  points: [number, number][];
  color: string;
  dashed?: boolean;
  weight?: number;
}
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  kind: "bus" | "stop" | "school" | "mine" | "pin";
  color?: string;
  label?: string;
  /** Text shown when the marker is clicked. */
  popup?: string;
  faded?: boolean;
}
export interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  lines?: MapLine[];
  markers?: MapMarker[];
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
  /** Zoom to show everything when this key changes (e.g. another route chosen). */
  fitKey?: string;
  className?: string;
}

const ICON: Record<MapMarker["kind"], string> = { bus: "directions_bus", stop: "location_on", school: "school", mine: "home_pin", pin: "add_location" };

const iconFor = (m: MapMarker) => {
  const size = m.kind === "bus" ? 34 : m.kind === "stop" ? 24 : 30;
  const color = m.color ?? (m.kind === "school" ? "#1A365D" : m.kind === "mine" ? "#C53030" : "#2B6CB0");
  const bubble = m.kind === "bus" || m.kind === "school";
  const label = m.label ? `<span style="position:absolute;left:${size}px;top:2px;white-space:nowrap;background:#fff;border-radius:6px;padding:1px 6px;font:700 11px system-ui;color:#1a202c;box-shadow:0 1px 3px rgba(0,0,0,.25)">${m.label.replace(/</g, "&lt;")}</span>` : "";
  const html = bubble
    ? `<div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff;opacity:${m.faded ? 0.5 : 1}"><span class="material-symbols-outlined" style="font-size:${size - 14}px;color:#fff">${ICON[m.kind]}</span>${label}</div>`
    : `<div style="position:relative;width:${size}px;height:${size}px;opacity:${m.faded ? 0.5 : 1}"><span class="material-symbols-outlined" style="font-size:${size}px;color:${color};text-shadow:0 1px 2px rgba(0,0,0,.35)">${ICON[m.kind]}</span>${label}</div>`;
  return L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: bubble ? [size / 2, size / 2] : [size / 2, size] });
};

export default function LeafletMap({ center, zoom = 14, lines = [], markers = [], onMapClick, onMarkerClick, fitKey, className }: MapProps) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const clickRef = useRef(onMapClick);
  const markerRef = useRef(onMarkerClick);
  const fitted = useRef<string | undefined>(undefined);
  clickRef.current = onMapClick;
  markerRef.current = onMarkerClick;

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: true }).setView([center.lat, center.lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => clickRef.current?.(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // The map is made once; later centres come through fitKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = layer.current;
    const m = map.current;
    if (!g || !m) return;
    g.clearLayers();
    for (const l of lines) if (l.points.length > 1) L.polyline(l.points, { color: l.color, weight: l.weight ?? 5, opacity: 0.8, dashArray: l.dashed ? "6 8" : undefined }).addTo(g);
    for (const mk of markers) {
      const marker = L.marker([mk.lat, mk.lng], { icon: iconFor(mk), zIndexOffset: mk.kind === "bus" ? 1000 : 0 }).addTo(g);
      if (mk.popup) marker.bindPopup(mk.popup.replace(/</g, "&lt;").replace(/\n/g, "<br>"));
      marker.on("click", () => markerRef.current?.(mk.id));
    }
    if (fitKey !== undefined && fitted.current !== fitKey) {
      fitted.current = fitKey;
      const pts: [number, number][] = [...lines.flatMap((l) => l.points), ...markers.map((x) => [x.lat, x.lng] as [number, number])];
      if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
      else if (pts.length === 1) m.setView(pts[0], 15);
    }
  }, [lines, markers, fitKey]);

  return <div ref={box} className={className ?? "h-[420px] w-full rounded-2xl overflow-hidden z-0"} />;
}
