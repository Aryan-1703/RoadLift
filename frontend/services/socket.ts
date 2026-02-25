import { Location, Provider } from '../types';

// Mocked Socket.IO client
type EventHandler = (data: any) => void;

class MockSocket {
  private handlers: Record<string, EventHandler[]> = {};
  private trackingInterval: ReturnType<typeof setInterval> | null = null;

  on(event: string, handler: EventHandler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  off(event: string, handler: EventHandler) {
    if (!this.handlers[event]) return;
    this.handlers[event] = this.handlers[event].filter(h => h !== handler);
  }

  emit(event: string, data: any) {
    console.log(`[Socket Emit] ${event}`, data);

    if (event === 'request-service') {
      // Simulate backend finding a provider after 3 seconds
      setTimeout(() => {
        const mockProvider: Provider = {
          id: 'prov_456',
          name: 'Mike Towing',
          rating: 4.8,
          vehicle: 'Flatbed Tow Truck - XYZ 123',
          location: {
            latitude: data.lat + 0.015, // Start slightly away
            longitude: data.lng + 0.015,
          }
        };
        this.trigger('provider-assigned', mockProvider);
        this.startMockTracking(data.lat, data.lng, mockProvider);
      }, 3000);
    }

    if (event === 'cancel-request') {
      this.stopTracking();
    }
  }

  private trigger(event: string, data: any) {
    console.log(`[Socket Receive] ${event}`, data);
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => handler(data));
    }
  }

  private startMockTracking(targetLat: number, targetLng: number, provider: Provider) {
    let currentLat = provider.location.latitude;
    let currentLng = provider.location.longitude;
    let steps = 0;
    const maxSteps = 10; // Arrives in 10 steps

    this.trackingInterval = setInterval(() => {
      steps++;
      if (steps >= maxSteps) {
        this.stopTracking();
        this.trigger('job-completed', { finalPrice: 85.00 });
        return;
      }

      // Move closer
      currentLat -= (provider.location.latitude - targetLat) / maxSteps;
      currentLng -= (provider.location.longitude - targetLng) / maxSteps;

      this.trigger('provider-location-update', {
        latitude: currentLat,
        longitude: currentLng,
        eta: maxSteps - steps // Mock ETA in minutes
      });
    }, 2000); // Update every 2 seconds
  }

  private stopTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }
}

export const socket = new MockSocket();
