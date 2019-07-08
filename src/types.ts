interface AccountUsername {
  username: string;
}

interface AccountEmail {
  email: null | string;
}

export interface AccountCredentials extends AccountUsername {
  password: string;
}

export type AccountInput = AccountCredentials & Partial<AccountEmail>;

export interface AccountFromDatabase extends AccountUsername, AccountEmail {
  id: number;
}
