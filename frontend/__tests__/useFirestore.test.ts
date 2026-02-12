// Mock API - MUST be at top before imports
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockJson = jest.fn();
const mockRes = jest.fn();

jest.mock('../hooks/api', () => ({
  api: jest.fn(async () => ({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete
  }))
}));

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
    mockGet.mockReturnValue({ json: mockJson, res: mockRes });
    mockPost.mockReturnValue({ json: mockJson, res: mockRes });
    mockPut.mockReturnValue({ json: mockJson, res: mockRes });
    mockDelete.mockReturnValue({ json: mockJson, res: mockRes });
  });

  describe('User Profile', () => {
    it('should create user profile', async () => {
      mockJson.mockResolvedValue({ message: 'Profile created' });

      const profile = {
        email: 'test@example.com',
        full_name: 'John Doe'
      };

      const result = await createUserProfile(userId, profile);

      expect(result).toBe(userId);
      expect(mockPost).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          email: 'test@example.com',
          full_name: 'John Doe'
        }),
        `/users/${userId}/profile`
      );
    });

    it('should get user profile', async () => {
      const mockProfile = {
        userId,
        email: 'test@example.com',
        full_name: 'John Doe'
      };

      mockJson.mockResolvedValue(mockProfile);

      const result = await getUserProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(mockGet).toHaveBeenCalledWith(`/users/${userId}/profile`);
    });

    it('should return null when profile not found', async () => {
      mockJson.mockRejectedValue({ status: 404 });

      const result = await getUserProfile(userId);

      expect(result).toBeNull();
    });
  });

  describe('Search History', () => {
    it('should add search history item', async () => {
      mockJson.mockResolvedValue({ id: 'search-123' });

      const result = await addSearchHistory(userId, 'Hall Building', '1455 De Maisonneuve Blvd. W');

      expect(result).toBe('search-123');
      expect(mockPost).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'Hall Building',
          locations: '1455 De Maisonneuve Blvd. W'
        }),
        `/users/${userId}/search-history`
      );
    });

    it('should get search history with correct limit', async () => {
      const mockHistory = [
        {
          searchId: 'search-1',
          query: 'Hall Building',
          locations: '1455 De Maisonneuve Blvd. W',
          timestamp: new Date().toISOString()
        },
        {
          searchId: 'search-2',
          query: 'JMSB',
          locations: '1500 René Levesque Blvd. W',
          timestamp: new Date().toISOString()
        }
      ];

      mockJson.mockResolvedValue(mockHistory);

      const result = await getSearchHistory(userId, 10);

      expect(result).toHaveLength(2);
      expect(result[0].searchId).toBe('search-1');
      expect(mockGet).toHaveBeenCalledWith(`/users/${userId}/search-history?limit=10`);
    });

    it('should clear all search history', async () => {
      mockRes.mockResolvedValue({});

      await clearSearchHistory(userId);

      expect(mockDelete).toHaveBeenCalledWith(`/users/${userId}/search-history`);
    });
  });

  describe('Schedule', () => {
    it('should add schedule item', async () => {
      mockJson.mockResolvedValue({ id: 'schedule-123' });

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
      expect(mockPost).toHaveBeenCalledWith(item, `/users/${userId}/schedule`);
    });

    it('should get user schedule', async () => {
      const mockSchedule = [
        {
          scheduleId: 'schedule-1',
          name: 'Morning Class',
          startTime: '09:00',
          endTime: '10:30',
          daysOfWeek: ['Monday'],
          type: 'class'
        }
      ];

      mockJson.mockResolvedValue(mockSchedule);

      const result = await getUserSchedule(userId);

      expect(result).toEqual(mockSchedule);
      expect(mockGet).toHaveBeenCalledWith(`/users/${userId}/schedule`);
    });

    it('should update schedule item', async () => {
      mockRes.mockResolvedValue({});

      const updates = {
        name: 'Updated Class',
        startTime: '14:00'
      };

      await updateScheduleItem(userId, 'schedule-123', updates);

      expect(mockPut).toHaveBeenCalledWith(updates, `/users/${userId}/schedule/schedule-123`);
    });

    it('should delete schedule item', async () => {
      mockRes.mockResolvedValue({});

      await deleteScheduleItem(userId, 'schedule-123');

      expect(mockDelete).toHaveBeenCalledWith(`/users/${userId}/schedule/schedule-123`);
    });
  });

  describe('Saved Addresses', () => {
    it('should add saved address', async () => {
      mockJson.mockResolvedValue({ id: 'address-123' });

      const result = await addSavedAddress(userId, {
        address: '1455 De Maisonneuve Blvd. W, Montreal'
      });

      expect(result).toBe('address-123');
      expect(mockPost).toHaveBeenCalledWith(
        { address: '1455 De Maisonneuve Blvd. W, Montreal' },
        `/users/${userId}/savedAddresses`
      );
    });

    it('should get saved addresses', async () => {
      const mockAddresses = [
        {
          addressId: 'address-1',
          address: '1455 De Maisonneuve Blvd. W'
        }
      ];

      mockJson.mockResolvedValue(mockAddresses);

      const result = await getSavedAddresses(userId);

      expect(result).toHaveLength(1);
      expect(result[0].addressId).toBe('address-1');
      expect(mockGet).toHaveBeenCalledWith(`/users/${userId}/savedAddresses`);
    });

    it('should update saved address', async () => {
      mockRes.mockResolvedValue({});

      const updates = {
        address: 'Updated Address'
      };

      await updateSavedAddress(userId, 'address-123', updates);

      expect(mockPut).toHaveBeenCalledWith(updates, `/users/${userId}/savedAddresses/address-123`);
    });

    it('should delete saved address', async () => {
      mockRes.mockResolvedValue({});

      await deleteSavedAddress(userId, 'address-123');

      expect(mockDelete).toHaveBeenCalledWith(`/users/${userId}/savedAddresses/address-123`);
    });
  });
});
