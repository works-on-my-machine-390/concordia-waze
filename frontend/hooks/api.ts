import wretch from "wretch";

export const API_URL = "http://10.0.0.156:8080";

export const api = (token?: string) => 
    wretch(API_URL).headers(token ? {Authorization: `Bearer ${token}` } : {});

