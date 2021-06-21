import { FileCookieStore } from 'tough-cookie-file-store';
import { CookieJar } from 'tough-cookie';
export const cookieJar = new CookieJar(new FileCookieStore('./db/cookies.json'));

import { Floatplane } from 'floatplane';
export const fApi = new Floatplane(cookieJar);
