import { User, NotificationPreferences, ActiveSession, Vehicle, PaymentMethod } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  get: async <T,>(endpoint: string): Promise<{ data: T }> => {
    await delay(600);
    
    if (endpoint === '/users/preferences') {
      return {
        data: {
          push: true,
          sms: true,
          emailReceipts: true,
          promotions: false
        } as unknown as T
      };
    }

    if (endpoint === '/users/sessions') {
      return {
        data: [
          { id: 'sess_1', device: 'iPhone 13 Pro', location: 'Toronto, ON', lastActive: 'Active now', isCurrent: true },
          { id: 'sess_2', device: 'MacBook Pro', location: 'Toronto, ON', lastActive: '2 days ago', isCurrent: false }
        ] as unknown as T
      };
    }

    if (endpoint === '/users/vehicles') {
      return {
        data: [
          { id: 'veh_1', make: 'Toyota', model: 'Camry', year: '2020', color: 'Silver', licensePlate: 'ABCD 123', isDefault: true },
          { id: 'veh_2', make: 'Honda', model: 'Civic', year: '2018', color: 'Black', licensePlate: 'WXYZ 987', isDefault: false }
        ] as unknown as T
      };
    }

    if (endpoint === '/users/payments') {
      return {
        data: [
          { id: 'pm_1', brand: 'Visa', last4: '4242', expMonth: 12, expYear: 2025, isDefault: true },
          { id: 'pm_2', brand: 'Mastercard', last4: '5555', expMonth: 8, expYear: 2024, isDefault: false }
        ] as unknown as T
      };
    }

    throw new Error(`Endpoint GET ${endpoint} not mocked`);
  },

  post: async <T,>(endpoint: string, data?: any): Promise<{ data: T }> => {
    await delay(800);

    if (endpoint === '/auth/login') {
      if (data.email && data.password) {
        return {
          data: {
            id: 'usr_123',
            email: data.email,
            name: 'Alex Customer',
            token: 'mock_jwt_token_898989'
          } as unknown as T
        };
      }
      throw new Error('Invalid credentials');
    }

    if (endpoint === '/users/password/change') {
      if (data.currentPassword === 'wrong') throw new Error('Incorrect current password');
      return { data: { success: true } as unknown as T };
    }

    if (endpoint === '/users/sessions/logout-all') {
      return { data: { success: true } as unknown as T };
    }

    if (endpoint === '/users/delete') {
      if (data.password === 'wrong') throw new Error('Incorrect password');
      return { data: { success: true } as unknown as T };
    }

    if (endpoint === '/users/vehicles') {
      return { data: { id: `veh_${Math.random()}`, ...data } as unknown as T };
    }

    throw new Error(`Endpoint POST ${endpoint} not mocked`);
  },

  put: async <T,>(endpoint: string, data: any): Promise<{ data: T }> => {
    await delay(600);
    if (endpoint === '/users/preferences') {
      return { data: data as T };
    }
    throw new Error(`Endpoint PUT ${endpoint} not mocked`);
  },

  delete: async <T,>(endpoint: string): Promise<{ data: T }> => {
    await delay(600);
    if (endpoint.startsWith('/users/vehicles/')) {
      return { data: { success: true } as unknown as T };
    }
    throw new Error(`Endpoint DELETE ${endpoint} not mocked`);
  }
};
