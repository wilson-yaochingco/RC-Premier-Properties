import { OFFICIAL_EMAIL, OFFICIAL_PHONE, OFFICIAL_PHONE_HREF } from "./public-contact";

export interface PublicAgent {
  name: string;
  role: string;
  phone: string;
  phoneHref: string;
  email: string;
  /** Absent until a real photograph is supplied; a neutral architectural mark is shown. */
  photoUrl?: string;
}

/** The agent shown on every listing. Contact details are the approved public ones. */
export const PUBLIC_AGENT: PublicAgent = {
  name: "Renzo Yao",
  role: "Property Agent",
  phone: OFFICIAL_PHONE,
  phoneHref: OFFICIAL_PHONE_HREF,
  email: OFFICIAL_EMAIL,
};
