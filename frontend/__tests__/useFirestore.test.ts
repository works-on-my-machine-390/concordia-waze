// Mock Firebase Firestore - MUST be at top before imports
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn()
}));

jest.mock('../config/firebase', () => ({
  db: {}
}));

import * as firebaseModule from 'firebase/firestore';
import {
  addSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  addScheduleItem,
  getUserSchedule,
  updateScheduleItem,
  deleteScheduleItem,
  addSavedAddress,
  getSavedAddresses,
  updateSavedAddress,
  deleteSavedAddress,
  createUserProfile,
  getUserProfile
} from '../hooks/firebase/useFirestore';

describe('useFirestore', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Search History', () => {
    it('should add search history item', async () => {
      const mockDocRef = { id: 'search-123' };
      (firebaseModule.addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const result = await addSearchHistory(userId, 'Hall Building', '1455 De Maisonneuve Blvd. W');

      expect(result).toBe('search-123');
      expect(firebaseModule.addDoc).toHaveBeenCalled();
    });

    it('should get search history with correct ordering', async () => {
      const mockDocs = [
        {
          id: 'search-1',
          data: () => ({
            query: 'Hall Building',
            locations: '1455 De Maisonneuve Blvd. W',
            timestamp: new Date()
          })
        },
        {
          id: 'search-2',
          data: () => ({
            query: 'JMSB',
            locations: '1500 René Levesque Blvd. W',
            timestamp: new Date()
          })
        }
      ];

      const mockSnapshot = {
        docs: mockDocs
      };

      (firebaseModule.getDocs as jest.Mock).mockResolvedValue(mockSnapshot as any);
      (firebaseModule.query as jest.Mock).mockReturnValue({} as any);
      (firebaseModule.collection as jest.Mock).mockReturnValue({} as any);
      (firebaseModule.orderBy as jest.Mock).mockReturnValue({} as any);
      (firebaseModule.limit as jest.Mock).mockReturnValue({} as any);

      const result = await getSearchHistory(userId, 10);

      expect(result).toHaveLength(2);
      expect(result[0].searchId).toBe('search-1');
      expect(result[0].query).toBe('Hall Building');
      expect(firebaseModule.getDocs).toHaveBeenCalled();
    });

    it('should clear all search history', async () => {
      const mockDocs = [
        { ref: { id: 'search-1' }, id: 'search-1' },
        { ref: { id: 'search-2' }, id: 'search-2' }
      ];

      const mockSnapshot = {
        docs: mockDocs
      };

      (firebaseModule.getDocs as jest.Mock).mockResolvedValue(mockSnapshot as any);
      (firebaseModule.deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await clearSearchHistory(userId);

      expect(firebaseModule.deleteDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('Schedule', () => {
    it('should add schedule item', async () => {
      const mockDocRef = { id: 'schedule-123' };
      (firebaseModule.addDoc as jest.Mock).mockResolvedValue(mockDocRef as any);

      const item = {
        name: 'SOEN 390 Lecture',
        building: 'Hall Building',
        room: 'H-929',
        startTime: '17:45',
        endTime: '20:15',
        daysOfWeek: ['Monday', 'Wednesday'],
        type: 'class'
      };

      const result = await addScheduleItem(userId, item);

      expect(result).toBe('schedule-123');
      expect(firebaseModule.addDoc).toHaveBeenCalled();
    });

    it('should get user schedule ordered by start time', async () => {
      const mockDocs = [
        {
          id: 'schedule-1',
          data: () => ({
            name: 'Morning Class',
            startTime: '09:00',
            endTime: '10:30',
            daysOfWeek: ['Monday']
          })
        },
        {
          id: 'schedule-2',
          data: () => ({
            name: 'Afternoon Class',
            startTime: '14:00',
            endTime: '15:30',
            daysOfWeek: ['Monday']
          })
        }
      ];

      const mockSnapshot = {
        docs: mockDocs
      };

      (firebaseModule.getDocs as jest.Mock).mockResolvedValue(mockSnapshot as any);
      (firebaseModule.query as jest.Mock).mockReturnValue({} as any);
      (firebaseModule.collection as jest.Mock).mockReturnValue({} as any);
      (firebaseModule.orderBy as jest.Mock).mockReturnValue({} as any);

      const result = await getUserSchedule(userId);

      expect(result).toHaveLength(2);
      expect(result[0].scheduleId).toBe('schedule-1');
      expect(result[0].name).toBe('Morning Class');
    });

    it('should update schedule item', async () => {
      (firebaseModule.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const updates = {
        name: 'Updated Class',
        startTime: '14:00'
      };

      await updateScheduleItem(userId, 'schedule-123', updates);

      expect(firebaseModule.updateDoc).toHaveBeenCalled();
    });

    it('should delete schedule item', async () => {
      (firebaseModule.deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await deleteScheduleItem(userId, 'schedule-123');

      expect(firebaseModule.deleteDoc).toHaveBeenCalled();
    });
  });

  describe('Saved Addresses', () => {
    it('should add saved address', async () => {
      const mockDocRef = { id: 'address-123' };
      (firebaseModule.addDoc as jest.Mock).mockResolvedValue(mockDocRef as any);

      const result = await addSavedAddress(userId, {
        address: '1455 De Maisonneuve Blvd. W, Montreal'
      });

      expect(result).toBe('address-123');
      expect(firebaseModule.addDoc).toHaveBeenCalled();
    });

    it('should get saved addresses', async () => {
      const mockDocs = [
        {
          id: 'address-1',
          data: () => ({
            address: '1455 De Maisonneuve Blvd. W'
          })
        }
      ];

      const mockSnapshot = {
        docs: mockDocs
      };

      (firebaseModule.getDocs as jest.Mock).mockResolvedValue(mockSnapshot as any);
      (firebaseModule.query as jest.Mock).mockReturnValue({} as any);
      (firebaseModule.collection as jest.Mock).mockReturnValue({} as any);
      (firebaseModule.orderBy as jest.Mock).mockReturnValue({} as any);

      const result = await getSavedAddresses(userId);

      expect(result).toHaveLength(1);
      expect(result[0].addressId).toBe('address-1');
      expect(result[0].address).toBe('1455 De Maisonneuve Blvd. W');
    });

    it('should update saved address', async () => {
      (firebaseModule.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const updates = {
        address: 'Updated Address'
      };

      await updateSavedAddress(userId, 'address-123', updates);

      expect(firebaseModule.updateDoc).toHaveBeenCalled();
    });

    it('should delete saved address', async () => {
      (firebaseModule.deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await deleteSavedAddress(userId, 'address-123');

      expect(firebaseModule.deleteDoc).toHaveBeenCalled();
    });
  });

  describe('User Profile', () => {
    it('should create user profile', async () => {
      (firebaseModule.setDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await createUserProfile(userId, {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      });

      expect(result).toBe(userId);
      expect(firebaseModule.setDoc).toHaveBeenCalled();
    });

    it('should get user profile', async () => {
      const mockData = {
        userId,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      const mockSnapshot = {
        exists: () => true,
        data: () => mockData
      };

      (firebaseModule.getDoc as jest.Mock).mockResolvedValue(mockSnapshot as any);

      const result = await getUserProfile(userId);

      expect(result).toEqual(mockData);
      expect(firebaseModule.getDoc).toHaveBeenCalled();
    });

    it('should return null if profile does not exist', async () => {
      const mockSnapshot = {
        exists: () => false
      };

      (firebaseModule.getDoc as jest.Mock).mockResolvedValue(mockSnapshot as any);

      const result = await getUserProfile(userId);

      expect(result).toBeNull();
    });
  });
});
