import type { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: '2ddd9ce3-1544-443c-92be-7b55df2724c7',
        authority: 'https://login.microsoftonline.com/7c202846-0f3d-454d-94eb-9480aaf69ff3',
        redirectUri: window.location.origin
    },
    cache: {
        cacheLocation: "localStorage",
    },
};

export const loginRequest: PopupRequest = {
    scopes: ["User.Read"]
};
