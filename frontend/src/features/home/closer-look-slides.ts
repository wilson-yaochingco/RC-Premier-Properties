import type { StaticImageData } from "next/image";
import exterior from "@/assets/site/location.png";
import interior from "@/assets/site/home-hero-3.png";
import details from "@/assets/site/contact.png";
import entrance from "@/assets/site/about.png";

export interface CloserLookSlide {
  id: string;
  label: string;
  headline: string;
  description: string;
  image: StaticImageData;
  alt: string;
  /** CSS `object-position`, chosen per photo so portrait images crop to their subject. */
  objectPosition: string;
  /** Optional focal point for the shallow mobile frame and its angled lower edge. */
  mobileObjectPosition?: string;
}

/**
 * Static buyer guidance. Deliberately not tied to any listing: the copy makes no claim about
 * a specific property, and the photography only illustrates each theme.
 */
export const CLOSER_LOOK_SLIDES: CloserLookSlide[] = [
  {
    id: "location",
    label: "Location",
    headline: "The address is only part of the story.",
    description:
      "Consider how the area fits your daily routines, the places you need to reach, the surroundings you value, and the way you want to live.",
    image: exterior,
    alt: "Contemporary house exterior with a timber-clad overhanging roof, glass balcony and gated frontage",
    objectPosition: "50% 42%",
    mobileObjectPosition: "50% 40%",
  },
  {
    id: "layout",
    label: "Layout",
    headline: "Good space should make sense.",
    description:
      "Look beyond the total floor area and consider how rooms connect, how naturally you move through the home, and where everyday life will happen.",
    image: interior,
    alt: "Open-plan living, kitchen and dining area beneath a double-height ceiling with a mezzanine",
    objectPosition: "50% 58%",
    mobileObjectPosition: "50% 56%",
  },
  {
    id: "details",
    label: "Everyday details",
    headline: "The small things shape how a home feels.",
    description:
      "Natural light, storage, parking, kitchen flow, finishes, and outdoor spaces can make just as much difference as the headline specifications.",
    image: details,
    alt: "Dining table beneath a sculptural pendant light, with a timber staircase and kitchen cabinetry behind",
    objectPosition: "50% 38%",
    mobileObjectPosition: "50% 42%",
  },
  {
    id: "in-person",
    label: "See it in person",
    headline: "Some decisions need more than photos.",
    description:
      "Walk through the property, experience the proportions and surroundings for yourself, and ask the questions that matter before making a decision.",
    image: entrance,
    alt: "Contemporary house entrance with a timber canopy, glass balcony and an open front door",
    objectPosition: "50% 66%",
    mobileObjectPosition: "50% 70%",
  },
];
