import api from "../api";

import { useQuery } from "@tanstack/react-query";

export const useGetGreeting = () => {
  return useQuery({
    queryKey: ["greeting"],
    queryFn: () => api.get("/greeting/obj").json<{ message: string }>(),
  });
};
