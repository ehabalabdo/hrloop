// ============================================================
// Geofencing Utility
// Uses the Haversine formula to calculate distance between two GPS points
// and determine if a user is within a branch's geofence radius.
// ============================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceResult {
  isWithinFence: boolean;
  distanceMeters: number;
  accuracy: number;
}

/**
 * Calculate distance between two GPS coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371000; // Earth's radius in meters

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.latitude)) *
      Math.cos(toRad(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get user's current GPS coordinates from the browser.
 * Returns a promise that resolves with the coordinates.
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // Always get fresh position
    });
  });
}

/**
 * Check if the user is within the geofence radius of a branch.
 */
export async function checkGeofence(
  branchLatitude: number,
  branchLongitude: number,
  geofenceRadius: number
): Promise<GeofenceResult> {
  const position = await getCurrentPosition();

  const userCoords: Coordinates = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };

  const branchCoords: Coordinates = {
    latitude: branchLatitude,
    longitude: branchLongitude,
  };

  const distanceMeters = haversineDistance(userCoords, branchCoords);

  return {
    isWithinFence: distanceMeters <= geofenceRadius,
    distanceMeters: Math.round(distanceMeters),
    accuracy: position.coords.accuracy,
  };
}

/**
 * Map geolocation error codes to user-friendly messages.
 */
export function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location access denied. Please enable location permissions in your browser settings.";
    case error.POSITION_UNAVAILABLE:
      return "Location information is unavailable. Please try again.";
    case error.TIMEOUT:
      return "Location request timed out. Please try again.";
    default:
      return "An unknown error occurred while getting your location.";
  }
}
