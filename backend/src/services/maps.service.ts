import axios from 'axios';

export class MapsService {
  /**
   * Calculate routing distance and ETA using Google Routes API
   */
  static async getRoute(originLat: number, originLng: number, destLat: number, destLng: number) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // Google Routes API endpoint
    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    const payload = {
      origin: {
        location: { latLng: { latitude: originLat, longitude: originLng } }
      },
      destination: {
        location: { latLng: { latitude: destLat, longitude: destLng } }
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
        }
      });

      const route = response.data.routes[0];
      
      // Convert duration string like "1200s" to minutes
      const durationSeconds = parseInt(route.duration.replace('s', ''), 10);
      const etaMinutes = Math.ceil(durationSeconds / 60);
      
      // Convert meters to Kilometers
      const distanceKm = route.distanceMeters / 1000;

      return { eta: etaMinutes, distance: distanceKm };

    } catch (error) {
      console.error('Error fetching Google Routes:', error);
      throw new Error('Failed to calculate route ETA');
    }
  }
}
