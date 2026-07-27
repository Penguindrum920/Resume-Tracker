interface GoogleAccountsOauth2TokenClient {
  requestAccessToken(): void;
}

interface GoogleAccountsOauth2InitTokenClientArgs {
  client_id: string;
  scope: string;
  callback: (response: {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    authuser?: string;
    prompt?: string;
    error?: string;
  }) => void;
  error_callback?: (error: { type: string; message?: string }) => void;
  prompt?: string;
}

interface GoogleAccountsOauth2 {
  initTokenClient(
    args: GoogleAccountsOauth2InitTokenClientArgs,
  ): GoogleAccountsOauth2TokenClient;
}

interface GoogleAccounts {
  oauth2: GoogleAccountsOauth2;
}

interface Google {
  accounts: GoogleAccounts;
}

declare global {
  interface Window {
    google?: Google;
  }
}

export {};
