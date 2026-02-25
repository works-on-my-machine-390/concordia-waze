import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export interface PoiSearchResultModel {
  code: string; // place id
  name: string;
  long_name: string; // unused
  address: string;
  latitude: number;
  longitude: number;
  metro_accessible: boolean; // unused
  services: string[];
  departments: null; // unused
  venues: null; // unused
  accessibility: null; // unused
}

export interface PoiSearchResponse {
  data: PoiSearchResultModel[];
}

// TODO: experiment with grouping query keys by lat lng rounding
export const useGetNearbyPoi = (query: string, lat: number, lng: number) => {
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;

  return useQuery<PoiSearchResponse>({
    queryKey: ["poi", "search", query, roundedLat, roundedLng],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .get(`/pointofinterest?input=${query}&lat=${roundedLat}&lng=${roundedLng}`)
        .json<PoiSearchResponse>();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    placeholderData: MOCK_POI_RESPONSE,
    enabled: false //TODO remove when styling is ready
  });
};



const MOCK_POI_RESPONSE: PoiSearchResponse = {
  "data": [
    {
      "code": "places/ChIJ259WSWoayUwRKnWFOi1pLLk",
      "name": "Le Gym Concordia",
      "long_name": "",
      "address": "EV S2, 1515 Rue Sainte-Catherine O #206, Montréal, QC H3G 2H7, Canada",
      "latitude": 45.4953688,
      "longitude": -73.5779964,
      "metro_accessible": false,
      "services": [
        "gym",
        "sports_activity_location",
        "health",
        "point_of_interest",
        "establishment"
      ],
      "departments": null,
      "venues": null,
      "accessibility": null
    },
    {
      "code": "places/ChIJqW70JEEayUwRdpWX5aNck-c",
      "name": "Club Sportif MAA",
      "long_name": "",
      "address": "2070 Rue Peel, Montréal, QC H3A 1W6, Canada",
      "latitude": 45.5011862,
      "longitude": -73.5760178,
      "metro_accessible": false,
      "services": [
        "gym",
        "swimming_pool",
        "yoga_studio",
        "fitness_center",
        "sports_complex",
        "sports_activity_location",
        "sports_school",
        "massage",
        "sports_club",
        "association_or_organization",
        "medical_clinic",
        "physiotherapist",
        "health",
        "point_of_interest",
        "service",
        "establishment"
      ],
      "departments": null,
      "venues": null,
      "accessibility": null
    },
    {
      "code": "places/ChIJ3yPQ8jcbyUwRST-NCejs418",
      "name": "OUIFIT FITNESS CENTER",
      "long_name": "",
      "address": "First floor, 1117 Rue Sainte-Catherine O Unit 100, Montreal, QC H3B 1H9, Canada",
      "latitude": 45.499756399999995,
      "longitude": -73.5733637,
      "metro_accessible": false,
      "services": [
        "massage",
        "health",
        "point_of_interest",
        "service",
        "establishment"
      ],
      "departments": null,
      "venues": null,
      "accessibility": null
    },
    {
      "code": "places/ChIJZ0PT0EAayUwRn_OgWS1aX54",
      "name": "Club Athletique Sherbrooke Gym",
      "long_name": "",
      "address": "1100 Rue Sherbrooke O Suite 300, Montréal, QC H3A 3L6, Canada",
      "latitude": 45.5016165,
      "longitude": -73.5765108,
      "metro_accessible": false,
      "services": [
        "yoga_studio",
        "fitness_center",
        "spa",
        "sports_complex",
        "gym",
        "sports_activity_location",
        "sports_school",
        "massage",
        "consultant",
        "health",
        "point_of_interest",
        "service",
        "establishment"
      ],
      "departments": null,
      "venues": null,
      "accessibility": null
    },
    {
      "code": "places/ChIJAcTy4UQayUwRv29_OlM9X5g",
      "name": "MTLPILATES",
      "long_name": "",
      "address": "1440 Rue Peel, Montréal, QC H3A 1S8, Canada",
      "latitude": 45.5004072,
      "longitude": -73.57397089999999,
      "metro_accessible": false,
      "services": [
        "wellness_center",
        "fitness_center",
        "sports_complex",
        "gym",
        "sports_activity_location",
        "sports_school",
        "health",
        "point_of_interest",
        "establishment"
      ],
      "departments": null,
      "venues": null,
      "accessibility": null
    },
    {
      "code": "places/ChIJ2Zxs4QgbyUwRzGSuZdydArc",
      "name": "Calisthenics GYM MTL",
      "long_name": "",
      "address": "1972 Rue Sainte-Catherine O, Montréal, QC H3H 1M4, Canada",
      "latitude": 45.4919947,
      "longitude": -73.58106149999999,
      "metro_accessible": false,
      "services": [
        "fitness_center",
        "gym",
        "sports_activity_location",
        "health",
        "point_of_interest",
        "establishment"
      ],
      "departments": null,
      "venues": null,
      "accessibility": null
    },
    {
      "code": "places/ChIJn2jaDEQayUwRJCVGpzaxnwQ",
      "name": "Nautilus Plus Place Montréal Trust",
      "long_name": "",
      "address": "1500 Av. McGill College, Montréal, QC H3A 3J6, Canada",
      "latitude": 45.5019085,
      "longitude": -73.57196909999999,
      "metro_accessible": false,
      "services": [
        "gym",
        "fitness_center",
        "sports_activity_location",
        "consultant",
        "health",
        "point_of_interest",
        "service",
        "establishment"
      ],
      "departments": null,
      "venues": null,
      "accessibility": null
    },
    {
      "code": "places/ChIJE6pLvhgbyUwRg229Tzah7fc",
      "name": "Anytime Fitness Forum",
      "long_name": "",
      "address": "2313 Rue Sainte-Catherine O, Montréal, QC H3H 1N2, Canada",
      "latitude": 45.4899813,
      "longitude": -73.58461129999999,
      "metro_accessible": false,
      "services": [
        "gym",
        "sports_activity_location",
        "health",
        "point_of_interest",
        "establishment"
      ],
      "departments": null,
      "venues": null,
      "accessibility": null
    },
    {
      "code": "places/ChIJUQ2dMX4byUwRBShdWBzAAkw",
      "name": "Anytime Fitness",
      "long_name": "",
      "address": "733 Rue Cathcart, Montréal, QC H3B 5L6, Canada",
      "latitude": 45.502271799999995,
      "longitude": -73.5697789,
      "metro_accessible": false,
      "services": [
        "gym",
        "fitness_center",
        "sports_activity_location",
        "health",
        "point_of_interest",
        "establishment"
      ],
      "departments": null,
      "venues": null,
      "accessibility": null
    },
    {
      "code": "places/ChIJqc7gmEQayUwRyifFHzD8mSc",
      "name": "Nautilus Plus",
      "long_name": "",
      "address": "1 Pl. Monseigneur Charbonneau, Montreal, QC H3B 4M7, Canada",
      "latitude": 45.5012882,
      "longitude": -73.5687429,
      "metro_accessible": false,
      "services": [
        "gym",
        "fitness_center",
        "sports_activity_location",
        "consultant",
        "health",
        "point_of_interest",
        "service",
        "establishment"
      ],
      "departments": null,
      "venues": null,
      "accessibility": null
    }
  ]
}