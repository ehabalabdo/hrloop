"use client";

// ============================================================
// MapPicker — Interactive map with search & pin placement
// Uses Leaflet + OpenStreetMap (free, no API key needed)
// Search via Nominatim geocoding
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Loader2, LocateFixed } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue in Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function MapPicker({
  latitude,
  longitude,
  onLocationChange,
}: MapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([latitude, longitude], {
      icon: DefaultIcon,
      draggable: true,
    }).addTo(map);

    // Drag end → update coordinates
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onLocationChange(
        Math.round(pos.lat * 10000) / 10000,
        Math.round(pos.lng * 10000) / 10000
      );
      reverseGeocode(pos.lat, pos.lng);
    });

    // Click on map → move marker
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onLocationChange(
        Math.round(lat * 10000) / 10000,
        Math.round(lng * 10000) / 10000
      );
      reverseGeocode(lat, lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Fix map size after render
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker position when lat/lng props change externally
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - latitude) > 0.0001 ||
        Math.abs(currentPos.lng - longitude) > 0.0001
      ) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
      }
    }
  }, [latitude, longitude]);

  // Reverse geocode to get address
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
        { headers: { "User-Agent": "HRLoop/1.0" } }
      );
      const data = await res.json();
      if (data.display_name) {
        onLocationChange(
          Math.round(lat * 10000) / 10000,
          Math.round(lng * 10000) / 10000,
          data.display_name
        );
      }
    } catch {
      // Ignore geocoding errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search places via Nominatim
  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&accept-language=ar`,
        { headers: { "User-Agent": "HRLoop/1.0" } }
      );
      const data: SearchResult[] = await res.json();
      setSearchResults(data);
      setShowResults(data.length > 0);
    } catch {
      setSearchResults([]);
    }
    setIsSearching(false);
  }, []);

  // Debounced search
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchPlaces(value), 400);
  };

  // Select a search result
  const selectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 16);
    }

    onLocationChange(
      Math.round(lat * 10000) / 10000,
      Math.round(lng * 10000) / 10000,
      result.display_name
    );

    setShowResults(false);
    setSearchQuery(result.display_name.substring(0, 60));
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapRef.current.setView([lat, lng], 16);
        }
        onLocationChange(
          Math.round(lat * 10000) / 10000,
          Math.round(lng * 10000) / 10000
        );
        reverseGeocode(lat, lng);
      },
      () => {
        // Geolocation denied or unavailable
      }
    );
  };

  return (
    <div className="space-y-2">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="ابحث عن المكان..."
              className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg pr-9 pl-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              dir="rtl"
            />
            {isSearching && (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 animate-spin" />
            )}
          </div>
          <button
            type="button"
            onClick={getCurrentLocation}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
            title="موقعي الحالي"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute z-[1000] top-full mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectResult(result)}
                className="w-full text-right px-3 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 border-b border-zinc-100 dark:border-zinc-800 last:border-0 flex items-start gap-2 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-64 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
        style={{ zIndex: 0 }}
      />

      {/* Coordinates display */}
      <p className="text-[11px] text-zinc-400 text-center" dir="ltr">
        📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}
        <span className="mx-2">|</span>
        <span className="text-zinc-500">اضغط على الخريطة أو اسحب الدبوس لتحديد الموقع</span>
      </p>
    </div>
  );
}
