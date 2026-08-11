export type SameSite = true | false | 'lax' | 'strict' | 'none';

export interface CookieSerializeOptions {
  domain?: string;
  encode?: (val: string) => string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  priority?: 'low' | 'medium' | 'high';
  sameSite?: SameSite;
  secure?: boolean;
  partitioned?: boolean;
}
