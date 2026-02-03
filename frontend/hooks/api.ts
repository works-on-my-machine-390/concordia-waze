import wretch from "wretch";

export const API_URL = process.env.REACT_APP_API_BASE || "http://localhost:8080";

export const api = (token?: string) => 
    wretch(API_URL).headers(token ? {Authorization: `Bearer ${token}` } : {});

