import type { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: 'b68b0866-108e-4462-ae5b-402b4bce0a6d',
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin
    },
    cache: {
        cacheLocation: "localStorage",
    },
};

export const loginRequest: PopupRequest = {
    scopes: ["User.Read"]
};
