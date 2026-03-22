import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  CourseItem,
  SavedAddress,
  SearchHistoryItem,
  UserProfile,
} from "../hooks/firebase/useFirestore";
import {
  addGuestCourse,
  addGuestSavedAddress,
  addGuestSearchHistory,
  clearGuestData,
  clearGuestSearchHistory,
  deleteGuestClass,
  deleteGuestCourse,
  getGuestCourses,
  getGuestProfile,
  getGuestSavedAddresses,
  getGuestSearchHistory,
  setGuestCourses,
  setGuestProfile,
  setGuestSavedAddresses,
  updateGuestClass,
  updateGuestCourse,
} from "../hooks/guestStorage";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage");

// Setup AsyncStorage mock methods
AsyncStorage.getItem = jest.fn();
AsyncStorage.setItem = jest.fn();
AsyncStorage.removeItem = jest.fn();
AsyncStorage.multiRemove = jest.fn();

describe("guestStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("User Profile", () => {
    it("should get guest profile when it exists", async () => {
      const profile: UserProfile = {
        userId: "guest",
        email: "guest@example.com",
        full_name: "Guest User",
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(profile),
      );

      const result = await getGuestProfile();

      expect(result).toEqual(profile);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith("guest:profile");
    });

    it("should return null when guest profile does not exist", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getGuestProfile();

      expect(result).toBeNull();
    });

    it("should set guest profile", async () => {
      const profile: UserProfile = {
        userId: "guest",
        email: "guest@example.com",
        full_name: "Guest User",
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await setGuestProfile(profile);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "guest:profile",
        JSON.stringify(profile),
      );
    });
  });

  describe("Search History", () => {
    it("should add guest search history", async () => {
      const item: SearchHistoryItem = {
        query: "Hall Building",
        locations: "1455 De Maisonneuve Blvd. W",
        timestamp: new Date(),
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await addGuestSearchHistory(item);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe("guest:searchHistory");
      const data = JSON.parse(callArgs[1]);
      expect(data).toHaveLength(1);
      expect(data[0].query).toBe("Hall Building");
    });

    it("should get guest search history", async () => {
      const items: SearchHistoryItem[] = [
        {
          query: "Hall Building",
          locations: "1455 De Maisonneuve Blvd. W",
          timestamp: new Date(),
        },
        {
          query: "JMSB",
          locations: "1500 René Levesque Blvd. W",
          timestamp: new Date(),
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(items),
      );

      const result = await getGuestSearchHistory();

      expect(result).toHaveLength(2);
      expect(result[0].query).toBe("Hall Building");
    });

    it("should return empty array if no search history exists", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getGuestSearchHistory();

      expect(result).toEqual([]);
    });

    it("should clear guest search history", async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await clearGuestSearchHistory();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        "guest:searchHistory",
      );
    });
  });

  describe("Schedule", () => {
    it("should add guest course", async () => {
      const item: CourseItem = {
        name: "SOEN 384",
        classes: [
          {
            type: "Lecture",
            section: "N",
            day: "MON",
            startTime: "10:00",
            endTime: "12:00",
            buildingCode: "H",
            room: "110",
            origin: "manual",
          },
        ],
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await addGuestCourse(item);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe("guest:courses");
      const data = JSON.parse(callArgs[1]);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("SOEN 384");
    });

    it("should get guest courses", async () => {
      const items: CourseItem[] = [
        {
          name: "SOEN 384",
          classes: [],
        },
        {
          name: "COMP 352",
          classes: [],
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(items),
      );

      const result = await getGuestCourses();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("SOEN 384");
    });

    it("should update guest courses", async () => {
      const updatedItems: CourseItem[] = [
        {
          name: "SOEN 384",
          classes: [],
        },
      ];

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await setGuestCourses(updatedItems);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe("guest:courses");
      const data = JSON.parse(callArgs[1]);
      expect(data[0].name).toBe("SOEN 384");
    });

    it("should partially update a guest course", async () => {
      const items: CourseItem[] = [
        {
          name: "SOEN 384",
          classes: [
            {
              type: "Lecture",
              section: "N",
              day: "MON",
              startTime: "10:00",
              endTime: "12:00",
              buildingCode: "H",
              room: "110",
              origin: "manual",
            },
          ],
        },
        {
          name: "COMP 352",
          classes: [],
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(items),
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await updateGuestCourse("SOEN 384", {
        name: "SOEN 384 Updated",
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "guest:courses",
        expect.any(String),
      );

      const savedData = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
      );

      expect(savedData).toHaveLength(2);
      expect(savedData[0].name).toBe("SOEN 384 Updated");
      expect(savedData[0].classes[0].room).toBe("110");
      expect(savedData[1].name).toBe("COMP 352");
    });

    it("should partially update a guest class without changing other fields", async () => {
      const items: CourseItem[] = [
        {
          name: "SOEN 384",
          classes: [
            {
              type: "Lecture",
              section: "N",
              day: "MON",
              startTime: "10:00",
              endTime: "12:00",
              buildingCode: "H",
              room: "110",
              origin: "manual",
            },
            {
              type: "Lab",
              section: "M",
              day: "WED",
              startTime: "14:00",
              endTime: "16:00",
              buildingCode: "MB",
              room: "2.130",
              origin: "manual",
            },
          ],
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(items),
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await updateGuestClass("SOEN 384", 0, {
        room: "115",
        startTime: "11:00",
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "guest:courses",
        expect.any(String),
      );

      const savedData = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
      );

      expect(savedData[0].classes[0]).toMatchObject({
        type: "Lecture",
        section: "N",
        day: "MON",
        startTime: "11:00",
        endTime: "12:00",
        buildingCode: "H",
        room: "115",
        origin: "manual",
      });

      expect(savedData[0].classes[1]).toMatchObject({
        type: "Lab",
        section: "M",
        day: "WED",
        startTime: "14:00",
        endTime: "16:00",
        buildingCode: "MB",
        room: "2.130",
        origin: "manual",
      });
    });

    it("should delete only the selected guest class", async () => {
      const items: CourseItem[] = [
        {
          name: "SOEN 384",
          classes: [
            {
              type: "Lecture",
              section: "N",
              day: "MON",
              startTime: "10:00",
              endTime: "12:00",
              buildingCode: "H",
              room: "110",
              origin: "manual",
            },
            {
              type: "Lab",
              section: "M",
              day: "WED",
              startTime: "14:00",
              endTime: "16:00",
              buildingCode: "MB",
              room: "2.130",
              origin: "manual",
            },
          ],
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(items),
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await deleteGuestClass("SOEN 384", 0);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "guest:courses",
        expect.any(String),
      );

      const savedData = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
      );

      expect(savedData).toHaveLength(1);
      expect(savedData[0].name).toBe("SOEN 384");
      expect(savedData[0].classes).toHaveLength(1);
      expect(savedData[0].classes[0].type).toBe("Lab");
    });

    it("should remove the course when deleting its last guest class", async () => {
      const items: CourseItem[] = [
        {
          name: "SOEN 384",
          classes: [
            {
              type: "Lecture",
              section: "N",
              day: "MON",
              startTime: "10:00",
              endTime: "12:00",
              buildingCode: "H",
              room: "110",
              origin: "manual",
            },
          ],
        },
        {
          name: "COMP 352",
          classes: [],
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(items),
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await deleteGuestClass("SOEN 384", 0);

      const savedData = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
      );

      expect(savedData).toEqual([
        {
          name: "COMP 352",
          classes: [],
        },
      ]);
    });

    it("should delete an entire guest course", async () => {
      const items: CourseItem[] = [
        {
          name: "SOEN 384",
          classes: [],
        },
        {
          name: "COMP 352",
          classes: [],
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(items),
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await deleteGuestCourse("SOEN 384");

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "guest:courses",
        expect.any(String),
      );

      const savedData = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
      );

      expect(savedData).toEqual([
        {
          name: "COMP 352",
          classes: [],
        },
      ]);
    });

    it("should clear guest data", async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      await clearGuestData();

      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
      const callArgs = (AsyncStorage.multiRemove as jest.Mock).mock.calls[0][0];
      expect(callArgs).toContain("guest:courses");
    });
  });

  describe("Saved Addresses", () => {
    it("should add guest saved address", async () => {
      const address: SavedAddress = {
        address: "1455 De Maisonneuve Blvd. W, Montreal",
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await addGuestSavedAddress(address);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe("guest:savedAddresses");
      const data = JSON.parse(callArgs[1]);
      expect(data).toHaveLength(1);
      expect(data[0].address).toBe("1455 De Maisonneuve Blvd. W, Montreal");
    });

    it("should get guest saved addresses", async () => {
      const addresses: SavedAddress[] = [
        { address: "1455 De Maisonneuve Blvd. W" },
        { address: "1500 René Levesque Blvd. W" },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(addresses),
      );

      const result = await getGuestSavedAddresses();

      expect(result).toHaveLength(2);
      expect(result[0].address).toBe("1455 De Maisonneuve Blvd. W");
    });

    it("should update guest saved addresses", async () => {
      const updatedAddresses: SavedAddress[] = [
        { addressId: "address-1", address: "Updated Address" },
      ];

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await setGuestSavedAddresses(updatedAddresses);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const data = JSON.parse(callArgs[1]);
      expect(data[0].address).toBe("Updated Address");
    });

    it("should clear guest saved addresses", async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      await clearGuestData();

      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
      const callArgs = (AsyncStorage.multiRemove as jest.Mock).mock.calls[0][0];
      expect(callArgs).toContain("guest:savedAddresses");
    });
  });
});