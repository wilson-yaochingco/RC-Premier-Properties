import type { CreateDraftPropertyRequest } from "@rc/shared";

/**
 * The six RC Premier listings supplied by the business, as drafts.
 *
 * Specifications come only from each source caption. A number appears only where the caption
 * states it or the caption's own list can be counted; anything else is left out and noted in
 * `confirm`. Cities were confirmed by the owner on 2026-11-08. Every listing is still created as a
 * draft: publication is a separate staff decision.
 * Source captions are kept verbatim in `sourceCaption` as the internal record.
 */
export interface ListingPhoto {
  /** Unique numeric token in the original filename, e.g. "639696656". */
  token: string;
  /** Short subject used in the stored file name: `<slug>-<name>`. */
  name: string;
  alt: string;
}

export interface RcListing {
  /** Source folder inside RC-Premier-Properties-Asstes. */
  folder: string;
  /** Source photos carry a baked-in contact strip along the lower edge, cropped on import. */
  cropContactStrip: boolean;
  /** Photographs in gallery order; the first is the cover. */
  photos: ListingPhoto[];
  /** Absent while the source lacks the facts a draft needs; such a listing is held. */
  content?: CreateDraftPropertyRequest;
  /** Why the import skips this listing. */
  hold?: string;
  /** Verbatim source caption, kept as the internal record. */
  sourceCaption: string;
  /** Items the business must confirm before publication. */
  confirm: string[];
}

const baseLocation = (city: string, development?: string) => ({
  province: "Pampanga",
  city,
  ...(development ? { development } : {}),
  publicPrecision: "city-only" as const,
});

export const RC_PREMIER_LISTINGS: RcListing[] = [
  {
    folder: "property-1",
    cropContactStrip: false,
    sourceCaption:
      "PREMIER PROPERTY #3 | MODERN ASIAN SMART HOME BUNGALOW | Price: ₱20,500,000 | Lot Area: 300 sq.m | Floor Area: 220 sq.m | Smart & premium features: automated gate, CCTV setup, high ceiling design, Alexa built-in, solar water heater, water purifier system | Ground floor: 2-car carport, elevated porch, spacious living area, dining area with access to lanai, powder room, kitchen with island, pantry room, auxiliary/dirty kitchen, laundry area, garbage collection area | Bedrooms: common bedroom 1, common bedroom 2, junior master bedroom with en suite T&B, master bedroom with walk-in closet, en suite T&B and private lanai, maid's room with own T&B | Inclusions: rangehood, cooktop, sofa set, dining set, king-size bed, twin beds, curtains & blinds, 5 air-conditioning units",
    confirm: [
      "Bedroom count (4) excludes the maid's room; the caption lists rooms but states no count.",
      "Bathrooms (3) are the junior master and master en suites plus the maid's bath, as confirmed by the owner; the powder room is counted separately.",
      "Storeys (1) is taken from the title 'Bungalow'.",
      "Property number #3 is the source numbering; confirm it matches the intended property ID.",
    ],
    content: {
      propertyId: "PREMIER_PROPERTY_3",
      slug: "modern-asian-smart-home-bungalow",
      title: "Modern Asian Smart Home Bungalow",
      purpose: "sale",
      propertyType: "house-and-lot",
      featured: false,
      price: { amount: 20_500_000, negotiable: false },
      location: baseLocation("Mabalacat City"),
      specifications: {
        bedrooms: 4,
        bathrooms: 3,
        powderRooms: 1,
        parkingSpaces: 2,
        lotAreaSqm: 300,
        floorAreaSqm: 220,
        storeys: 1,
        furnishing: "Furniture included",
      },
      shortDescription:
        "A single-storey smart home on a 300 sqm lot with 220 sqm of floor area, a two-car carport, an island kitchen, and a master bedroom with its own walk-in closet, en suite bath and private lanai. Furniture and five air-conditioning units are included.",
      description:
        "A one-storey home with a two-car carport and an elevated porch at the front. Inside, the spacious living area is joined by a dining area that opens to a lanai, and the kitchen is planned around an island, with a pantry room, an auxiliary kitchen, a laundry area and a garbage collection area alongside it.\n\nThere are four bedrooms and a maid's room with its own toilet and bath. The junior master has an en suite toilet and bath, and the master bedroom adds a walk-in closet, an en suite toilet and bath, and a private lanai. A powder room serves the living spaces. The house is set up with an automated gate, CCTV, Alexa built-in, a solar water heater and a water purifier system, and it has a high-ceiling design. The sale includes a rangehood and cooktop, a sofa set, a dining set, a king-size bed, twin beds, curtains and blinds, and five air-conditioning units.",
      highlights: [
        "Single-storey layout on a 300 sqm lot",
        "Master bedroom with walk-in closet, en suite bath and private lanai",
        "Smart-home setup with Alexa built-in and an automated gate",
        "Furniture and five air-conditioning units included",
      ],
      amenities: [
        "Automated gate",
        "CCTV setup",
        "Solar water heater",
        "Water purifier system",
        "2-car carport",
        "Elevated porch",
      ],
      features: [
        "High ceiling design",
        "Alexa built-in",
        "Spacious living area",
        "Dining area with access to lanai",
        "Kitchen with island",
        "Pantry room",
        "Auxiliary kitchen",
        "Laundry area",
        "Garbage collection area",
        "Powder room",
        "Junior master bedroom with en suite toilet and bath",
        "Master bedroom with walk-in closet, en suite toilet and bath, and private lanai",
        "Maid's room with its own toilet and bath",
        "Rangehood and cooktop",
        "Sofa set and dining set",
        "King-size bed and twin beds",
        "Curtains and blinds",
        "5 air-conditioning units",
      ],
    },
    photos: [
      {
        token: "634671510",
        name: "exterior-front",
        alt: "Front exterior of a modern single-storey home with a dark metal gate and a flat roof",
      },
      {
        token: "638104625",
        name: "living-room",
        alt: "Living room with a TV wall, sofa and ring chandelier, with the dining area beyond",
      },
      {
        token: "615713729",
        name: "kitchen-island",
        alt: "Kitchen with a marble-topped island, pendant lights and wood cabinetry",
      },
      {
        token: "634843457",
        name: "entrance-porch",
        alt: "Elevated entrance porch with steps, a stone accent and a wood door",
      },
      {
        token: "640076608",
        name: "dining-area",
        alt: "Dining table set for six, with the living area behind it",
      },
      {
        token: "639192476",
        name: "kitchen-cooktop",
        alt: "L-shaped kitchen with a cooktop, rangehood and marble backsplash",
      },
      {
        token: "639598654",
        name: "bedroom-curtains",
        alt: "Bedroom with an upholstered bed, sheer curtains and a wood-panelled ceiling",
      },
      {
        token: "640068010",
        name: "bedroom-accent-wall",
        alt: "Bedroom with a dark accent wall, a wall-mounted air conditioner and a patterned bed",
      },
      {
        token: "634861890",
        name: "bedroom-single-bed",
        alt: "Bedroom with a single bed, curtains and a built-in desk",
      },
      {
        token: "636868549",
        name: "bathroom-vanity",
        alt: "Bathroom with a marble vanity, a lit mirror and a glass shower",
      },
      {
        token: "633931986",
        name: "carport",
        alt: "Carport with a patterned stone floor and a wood-panelled ceiling",
      },
      {
        token: "636722753",
        name: "lanai-stone-wall",
        alt: "Lanai with a stone feature wall and a pebble planting strip",
      },
      {
        token: "640129711",
        name: "patio-sliding-doors",
        alt: "Patio with sliding glass doors and a pebble garden strip",
      },
      {
        token: "635454264",
        name: "laundry-area",
        alt: "Laundry area with a deep sink and white shelving",
      },
      {
        token: "637725839",
        name: "kitchen-cabinetry",
        alt: "White kitchen cabinetry with a black countertop and sink",
      },
      {
        token: "637446896",
        name: "street-frontage",
        alt: "Street-side view of the home's gated frontage and landscaped edge",
      },
      {
        token: "639756145",
        name: "exterior-street-view",
        alt: "Front of the home seen from the street, with a gate and planting along the wall",
      },
    ],
  },
  {
    folder: "property-2",
    cropContactStrip: true,
    sourceCaption:
      "PREMIER PROPERTY #7 | MODERN FILIPINO SMART HOME | Price: ₱17,800,000 | Lot Area: 150 sq.m | Floor Area: 260 sq.m | Smart & premium features: smart home setup, automatic gate, CCTV room, pocket garden, parking storage, 90cm stove hob with rangehood, built-in oven, microwave, dispenser | Ground floor: 2-car garage, spacious living area, dining area, kitchen area with wine shelves, dirty kitchen with stove, lanai, maid's room, maid's toilet & bath | Bedrooms: 4 bedrooms, 5 toilet & bath (including maid's bathroom)",
    confirm: [
      "Storeys not stated in the caption, so omitted (the photos show a two-storey front).",
      "Property number #7 is the source numbering; confirm it matches the intended property ID.",
    ],
    content: {
      propertyId: "PREMIER_PROPERTY_7",
      slug: "modern-filipino-smart-home",
      title: "Modern Filipino Smart Home",
      purpose: "sale",
      propertyType: "house-and-lot",
      featured: false,
      price: { amount: 17_800_000, negotiable: false },
      location: baseLocation("City of San Fernando"),
      specifications: {
        bedrooms: 4,
        bathrooms: 5,
        parkingSpaces: 2,
        lotAreaSqm: 150,
        floorAreaSqm: 260,
      },
      shortDescription:
        "A smart home with 260 sqm of floor area on a 150 sqm lot, a two-car garage, four bedrooms, five toilets and baths including the maid's, and a kitchen with a built-in oven and wine shelves.",
      description:
        "The ground floor holds a two-car garage, a spacious living area, a dining area, and a kitchen with wine shelves, alongside a dirty kitchen with its own stove, a lanai, and a maid's room with its own toilet and bath. A pocket garden brings some greenery into the plan, and the parking area has storage.\n\nCooking is well equipped: a 90 cm stove hob with rangehood, a built-in oven, a microwave and a dispenser are included. The house has four bedrooms and five toilets and baths in total, the maid's bathroom among them. It is set up as a smart home, with an automatic gate and a CCTV room.",
      highlights: [
        "260 sqm of floor area on a 150 sqm lot",
        "Two-car garage with parking storage",
        "Four bedrooms and five toilets and baths",
        "Smart home setup with an automatic gate and CCTV room",
      ],
      amenities: [
        "Smart home setup",
        "Automatic gate",
        "CCTV room",
        "Pocket garden",
        "Parking storage",
        "2-car garage",
      ],
      features: [
        "Spacious living area",
        "Dining area",
        "Kitchen area with wine shelves",
        "Dirty kitchen with stove",
        "Lanai",
        "Maid's room with toilet and bath",
        "90 cm stove hob with rangehood",
        "Built-in oven",
        "Microwave",
        "Dispenser",
      ],
    },
    photos: [
      {
        token: "641476941",
        name: "exterior-front",
        alt: "Front exterior of a two-storey home with a wood gate, a balcony and a breeze-block wall",
      },
      {
        token: "641499791",
        name: "kitchen-dining-stairs",
        alt: "Open kitchen and dining area with a chandelier and a staircase",
      },
      {
        token: "639922973",
        name: "living-area",
        alt: "Living area with a black chandelier, herringbone flooring and tall windows",
      },
      {
        token: "641476195",
        name: "kitchen-wine-shelf",
        alt: "Kitchen with a marble island, a gas hob and a diamond-pattern wine shelf",
      },
      {
        token: "639696656",
        name: "garage",
        alt: "Covered garage with cobblestone paving and a wood slat wall",
      },
      {
        token: "641483845",
        name: "entrance-door",
        alt: "Entrance with a tall wood door and planting beside it",
      },
      {
        token: "641436295",
        name: "living-area-ceiling-fan",
        alt: "Bright room with a wood ceiling, a ceiling fan and herringbone flooring",
      },
      {
        token: "641448645",
        name: "breeze-block-screen",
        alt: "Interior with a breeze-block screen and a glass-panelled door to the outside",
      },
      {
        token: "640260096",
        name: "room-garden-door",
        alt: "Room with a wood-panelled wall, a ceiling fan and a sliding door to a small garden",
      },
      {
        token: "641386993",
        name: "bathroom",
        alt: "Bathroom with an oval basin, a glass shower enclosure and a backlit mirror",
      },
    ],
  },
  {
    folder: "property-3",
    cropContactStrip: true,
    sourceCaption:
      "PREMIER PROPERTY #8 | FURNISHED KOREAN INSPIRED HOME | Price: ₱18.5M (Negotiable) | Lot Area: 184 sq.m | Floor Area: 300 sq.m | Smart & premium features: fully furnished, CCTV system, doorbell with camera, Korean-style foyer, built-in karaoke system, balcony with power rack, water purifier system, stairwell bricks imported from Jeju Island, refrigerator, cooktop with rangehood | Ground floor: 2-car garage, elegant foyer entry, spacious living area, dining area, modern kitchen, powder room, maid's room | Bedrooms: 3 bedrooms, 3 toilet & bath, powder room, master bedroom | Experience authentic Korean-inspired living in a beautifully furnished home designed with premium finishes and unique features you won't find elsewhere. Perfect for families who love style, comfort, and entertainment at home!",
    confirm: [
      "Bedrooms (3) and toilets and baths (3) are owner-confirmed.",
      "Price is stated as ₱18.5M (Negotiable); stored as 18,500,000 and negotiable.",
      "Jeju Island stairwell bricks, karaoke system and Korean-style foyer are source claims; the photos do not show them.",
      "The photos show a lived-in, personally furnished home; confirm the furnishings that convey with the sale.",
      "Property number #8 is the source numbering; confirm it matches the intended property ID.",
    ],
    content: {
      propertyId: "PREMIER_PROPERTY_8",
      slug: "furnished-korean-inspired-home",
      title: "Furnished Korean-Inspired Home",
      purpose: "sale",
      propertyType: "house-and-lot",
      featured: false,
      price: { amount: 18_500_000, negotiable: true },
      location: baseLocation("Porac"),
      specifications: {
        bedrooms: 3,
        bathrooms: 3,
        powderRooms: 1,
        parkingSpaces: 2,
        lotAreaSqm: 184,
        floorAreaSqm: 300,
        furnishing: "Fully furnished",
      },
      shortDescription:
        "A fully furnished, Korean-inspired home with 300 sqm of floor area on a 184 sqm lot, a two-car garage, a built-in karaoke system and a balcony with a power rack.",
      description:
        "Designed around Korean-inspired living, the house opens through a Korean-style foyer into a spacious living area. The ground floor also has a dining area, a modern kitchen, a powder room and a maid's room, along with a two-car garage. It is sold fully furnished, and the kitchen includes a refrigerator and a cooktop with rangehood.\n\nThere are three bedrooms and three toilets and baths, plus the powder room. For entertainment, the house has a built-in karaoke system, and the balcony is set up with a power rack. A water purifier system serves the home, and security includes a CCTV system and a doorbell with a camera. According to the listing, the stairwell bricks were imported from Jeju Island.",
      highlights: [
        "Fully furnished",
        "Korean-style foyer and built-in karaoke system",
        "Balcony with a power rack",
        "300 sqm of floor area on a 184 sqm lot",
      ],
      amenities: [
        "CCTV system",
        "Doorbell with camera",
        "Water purifier system",
        "2-car garage",
        "Balcony",
      ],
      features: [
        "Fully furnished",
        "Korean-style foyer",
        "Built-in karaoke system",
        "Stairwell bricks imported from Jeju Island",
        "Spacious living area",
        "Dining area",
        "Modern kitchen",
        "Refrigerator",
        "Cooktop with rangehood",
        "Powder room",
        "Maid's room",
      ],
    },
    photos: [
      {
        token: "641391265",
        name: "exterior-front",
        alt: "Front exterior of a multi-level house with a pitched roof and a garage with a metal roll-up door",
      },
      {
        token: "638449676",
        name: "living-room",
        alt: "Furnished living room with a sofa set, a wall-mounted TV and a tray ceiling",
      },
      {
        token: "641393743",
        name: "kitchen-dining",
        alt: "Kitchen with an island and dining table, under a ring pendant light",
      },
      {
        token: "640134571",
        name: "kitchen",
        alt: "Kitchen with white cabinets, a stainless steel sink and a grey countertop",
      },
      {
        token: "639781998",
        name: "bedroom-display-wall",
        alt: "Bedroom with a large bed, a dark display wall and a balcony door",
      },
      {
        token: "640493026",
        name: "bedroom-grey-bed",
        alt: "Bedroom with a grey upholstered bed and floor-length curtains",
      },
      {
        token: "640106936",
        name: "bedroom-balcony-door",
        alt: "Furnished room with an exercise bike and a sliding door to the balcony",
      },
      {
        token: "641391028",
        name: "balcony-power-rack",
        alt: "Balcony with a power rack, a hanging chair and a wood-panelled ceiling",
      },
      {
        token: "641409964",
        name: "balcony",
        alt: "Covered balcony with a ceiling fan, a glass railing and sliding doors",
      },
      {
        token: "641403547",
        name: "bathroom",
        alt: "Bathroom with a basin, a toilet and a tiled shower area",
      },
    ],
  },
  {
    folder: "property-4",
    cropContactStrip: true,
    sourceCaption:
      "PREMIER PROPERTY #9 | FURNISHED BRAND-NEW MODERN HOME | Price: ₱16,000,000 | Location: inside a secured subdivision in Angeles City, near MarQuee Mall, NLEX, Landers Superstore, Infinity Shoppes and Angeles City Hall | Lot area: 150 sqm | Floor area: 215 sqm | Ground floor: two-car carport with storage, pocket garden, guest room, common toilet and bath, dipping pool, open-plan living, dining and kitchen, living area overlooking the pool, lanai | Second floor: master bedroom with walk-in closet, private bathroom and balcony, two ensuite bedrooms, family area | Fully furnished and advertised as move-in ready | Contact: +63 918 429 1873, rcpropertiesss@gmail.com, IG @rcpremierproperties (supplied by the business on 2026-11-08; the original description.txt was empty)",
    confirm: [
      "Bathrooms (4) is counted from the room breakdown (common toilet and bath, the master's private bathroom, two ensuite bedrooms); the caption states no total.",
      "Bedrooms (4) counts the guest room, the master and the two ensuite bedrooms.",
      "The dipping pool is in the caption but not in the supplied photographs.",
    ],
    content: {
      propertyId: "PREMIER_PROPERTY_9",
      slug: "furnished-brand-new-modern-home",
      title: "Furnished Brand-New Modern Home",
      purpose: "sale",
      propertyType: "house-and-lot",
      featured: false,
      price: { amount: 16_000_000, negotiable: false },
      location: baseLocation("Angeles City"),
      specifications: {
        bedrooms: 4,
        bathrooms: 4,
        parkingSpaces: 2,
        lotAreaSqm: 150,
        floorAreaSqm: 215,
        storeys: 2,
        furnishing: "Fully furnished",
      },
      shortDescription:
        "A fully furnished, brand-new two-storey home in a secured Angeles City subdivision, with 215 sqm of floor area on a 150 sqm lot, four bedrooms, a dipping pool, and a living area that overlooks it.",
      description:
        "The ground floor is planned around an open living, dining and kitchen space, with the living area looking out over a dipping pool and a lanai. A guest room with a common toilet and bath, a pocket garden, and a two-car carport with storage complete the level.\n\nUpstairs, the master bedroom has a walk-in closet, a private bathroom and a balcony, and two further bedrooms each have their own bathroom, arranged around a family area. The house is sold fully furnished and is advertised as move-in ready. It sits inside a secured subdivision in Angeles City, near MarQuee Mall, NLEX, Landers Superstore, Infinity Shoppes and Angeles City Hall.",
      highlights: [
        "Fully furnished and move-in ready",
        "Dipping pool overlooked by the living area",
        "Four bedrooms, three with their own bathroom",
        "Secured subdivision near MarQuee Mall and NLEX",
      ],
      amenities: [
        "Dipping pool",
        "Lanai",
        "Pocket garden",
        "2-car carport with storage",
        "Balcony",
      ],
      features: [
        "Fully furnished",
        "Open-plan living, dining and kitchen",
        "Living area overlooking the pool",
        "Guest room",
        "Common toilet and bath",
        "Master bedroom with walk-in closet, private bathroom and balcony",
        "Two ensuite bedrooms",
        "Family area",
      ],
    },
    photos: [
      {
        token: "640073299",
        name: "exterior-front",
        alt: "Front exterior of a two-storey house with a louvered metal gate and a balcony",
      },
      {
        token: "640135624",
        name: "living-room",
        alt: "Living room with a sectional sofa, a wall-mounted TV and a wood-slat accent wall",
      },
      {
        token: "640111391",
        name: "kitchen",
        alt: "U-shaped kitchen with wood cabinetry, a built-in oven and a gas hob",
      },
      {
        token: "641468524",
        name: "kitchen-dining-mezzanine",
        alt: "Double-height dining and kitchen area with an island, bar stools and a mezzanine railing",
      },
      {
        token: "641493569",
        name: "stairwell-window",
        alt: "Tall stairwell window with a pendant light, seen from the upper level",
      },
      {
        token: "641298954",
        name: "upstairs-hallway",
        alt: "Upstairs hallway with a wood-slat wall, a metal railing and cove lighting",
      },
      {
        token: "640574952",
        name: "bedroom-tv-wall",
        alt: "Bedroom with a bed, a wall-mounted TV and floor-length curtains",
      },
      {
        token: "643319307",
        name: "bedroom-balcony-door",
        alt: "Bedroom with a bed, a rug and a balcony door",
      },
      {
        token: "640278929",
        name: "bedroom-wardrobe",
        alt: "Empty room with wood flooring, a white wardrobe and a window",
      },
      {
        token: "640695074",
        name: "bathroom",
        alt: "Bathroom with a long vanity, a vessel basin and a tall narrow window",
      },
    ],
  },
  {
    folder: "property-5",
    cropContactStrip: true,
    sourceCaption:
      "PREMIER PROPERTY #10 | BRANDNEW MODERN 2-STOREY HOUSE | Price: ₱10,800,000 | Located in Metrogate Subdivision – a secured subdivision with amenities | Lot Area: 120 sq.m | Floor Area: 170 sq.m | Premium features: secured gated community, semi-furnished turnover, built-in cabinets, air-conditioned bedrooms, functional modern layout | Ground floor: 2-car garage, office/stock room, 1 toilet and bath, spacious living area, dining area, modern kitchen, service kitchen, lanai, pocket garden | Second floor: 2 bedrooms with cabinets & air-conditioning, common toilet and bath, master bedroom with walk-in closet and toilet and bath, balcony | Perfect for small families or investors looking for a modern home inside a prime secured community!",
    confirm: [
      "Bedrooms (3) and bathrooms (3) are counted from the caption's ground- and second-floor lists.",
      "Property number #10 is the source numbering; confirm it matches the intended property ID.",
    ],
    content: {
      propertyId: "PREMIER_PROPERTY_10",
      slug: "brand-new-modern-two-storey-house",
      title: "Brand New Modern Two-Storey House",
      purpose: "sale",
      propertyType: "house-and-lot",
      featured: false,
      price: { amount: 10_800_000, negotiable: false },
      location: baseLocation("Angeles City", "Metrogate Subdivision"),
      specifications: {
        bedrooms: 3,
        bathrooms: 3,
        parkingSpaces: 2,
        lotAreaSqm: 120,
        floorAreaSqm: 170,
        storeys: 2,
        furnishing: "Semi-furnished turnover",
      },
      shortDescription:
        "A brand-new two-storey house inside Metrogate Subdivision, a secured community, with 170 sqm of floor area on a 120 sqm lot, a two-car garage, three bedrooms and a balcony off the second floor.",
      description:
        "The ground floor brings the living area, dining area, modern kitchen and service kitchen together, with a lanai and pocket garden at the back, a two-car garage, an office or stock room, and a toilet and bath.\n\nUpstairs, two bedrooms with cabinets and air-conditioning share a common toilet and bath, and the master bedroom has a walk-in closet, its own toilet and bath, and a balcony. The house turns over semi-furnished, with built-in cabinets and air-conditioned bedrooms, and it sits inside Metrogate Subdivision, a secured gated community.",
      highlights: [
        "Brand-new two-storey home with 170 sqm of floor area",
        "Inside a secured, gated subdivision",
        "Master bedroom with walk-in closet, toilet and bath",
        "Semi-furnished turnover with built-in cabinets",
      ],
      amenities: [
        "Secured gated community",
        "2-car garage",
        "Lanai",
        "Pocket garden",
        "Balcony",
      ],
      features: [
        "Semi-furnished turnover",
        "Built-in cabinets",
        "Air-conditioned bedrooms",
        "Office or stock room",
        "Spacious living area",
        "Dining area",
        "Modern kitchen",
        "Service kitchen",
        "Two bedrooms with cabinets and air-conditioning",
        "Common toilet and bath",
        "Master bedroom with walk-in closet and toilet and bath",
      ],
    },
    photos: [
      {
        token: "641486500",
        name: "exterior-front",
        alt: "Front exterior of a two-storey house with a balcony, a dark metal fence and a gated entrance",
      },
      {
        token: "640217959",
        name: "living-dining-stairs",
        alt: "Living and dining area with a sofa, a wood coffee table and a staircase",
      },
      {
        token: "641298956",
        name: "kitchen",
        alt: "Kitchen with wood cabinets, a black countertop, a freestanding range and a refrigerator",
      },
      {
        token: "641457132",
        name: "balcony",
        alt: "Balcony with sliding glass doors and a glass railing",
      },
      {
        token: "641392248",
        name: "bedroom-balcony",
        alt: "Bedroom with a bed frame, a TV console and a glass door to the balcony",
      },
      {
        token: "641489585",
        name: "bedroom-windows",
        alt: "Bedroom with large windows, a bed frame and a wall-mounted air conditioner",
      },
      {
        token: "641466475",
        name: "bedroom-wardrobe",
        alt: "Bedroom with a bed frame and floor-to-ceiling wardrobe cabinets",
      },
      {
        token: "640397499",
        name: "bathroom-shower",
        alt: "Bathroom with a basin, a toilet and a glass shower against dark stone-effect tile",
      },
      {
        token: "641423098",
        name: "bathroom-vanity",
        alt: "Bathroom with a double vanity and a glass-enclosed shower",
      },
    ],
  },
  {
    folder: "property-6",
    cropContactStrip: true,
    sourceCaption:
      "PREMIER PROPERTY #11 | BRAND NEW MODERN HOME | Price: ₱13,500,000 | Located in a secured and well-maintained subdivision near Marquee Mall and Nlex | Lot Area: 150 sq.m | Floor Area: 190 sq.m | Premium features: automatic gate, 5 split-type air conditioning units, open pantry service kitchen, cooktop with rangehood, mini garden, modern architectural design | Ground floor: 2-car carport, 1 bedroom with cabinet, elegant toilet and bath, spacious living area, dining area, open kitchen with pantry, service kitchen | Second floor: common area, 1 common toilet and bath, 2 bedrooms with cabinet, master bedroom with walk-in cabinet & balcony | A perfect modern family home in a prime and accessible location!",
    confirm: [
      "Bathroom total is omitted: the caption lists a ground-floor and a common second-floor bathroom but does not mention the master's own bath; confirm the total.",
      "Bedrooms (4) is counted from the ground-floor and second-floor lists.",
      "Property number #11 is the source numbering; confirm it matches the intended property ID.",
    ],
    content: {
      propertyId: "PREMIER_PROPERTY_11",
      slug: "brand-new-modern-family-home",
      title: "Brand New Modern Family Home",
      purpose: "sale",
      propertyType: "house-and-lot",
      featured: false,
      price: { amount: 13_500_000, negotiable: false },
      location: baseLocation("Angeles City"),
      specifications: {
        bedrooms: 4,
        parkingSpaces: 2,
        lotAreaSqm: 150,
        floorAreaSqm: 190,
        storeys: 2,
      },
      shortDescription:
        "A brand-new two-storey home with 190 sqm of floor area on a 150 sqm lot, a two-car carport, four bedrooms, an open kitchen with a pantry and five split-type air-conditioning units, in a secured subdivision near Marquee Mall and NLEX.",
      description:
        "On the ground floor are a two-car carport, a bedroom with a cabinet, a toilet and bath, a spacious living area, a dining area, and an open kitchen with a pantry and a separate service kitchen.\n\nThe second floor adds a common area, a common toilet and bath, two bedrooms with cabinets, and a master bedroom with a walk-in cabinet and a balcony. The house comes with an automatic gate, five split-type air-conditioning units, a cooktop with rangehood and a mini garden, and it stands in a secured and well-maintained subdivision near Marquee Mall and NLEX.",
      highlights: [
        "Brand-new modern home with 190 sqm of floor area",
        "Two-car carport and automatic gate",
        "Five split-type air-conditioning units",
        "Secured subdivision near Marquee Mall and NLEX",
      ],
      amenities: ["Automatic gate", "2-car carport", "Mini garden", "Balcony"],
      features: [
        "Modern architectural design",
        "5 split-type air-conditioning units",
        "Open kitchen with pantry",
        "Service kitchen",
        "Cooktop with rangehood",
        "Spacious living area",
        "Dining area",
        "Ground-floor bedroom with cabinet",
        "Two second-floor bedrooms with cabinets",
        "Master bedroom with walk-in cabinet and balcony",
        "Common area on the second floor",
      ],
    },
    photos: [
      {
        token: "640328490",
        name: "exterior-carport",
        alt: "Angled front view of a two-storey house with a carport and a slatted feature wall",
      },
      {
        token: "641397173",
        name: "living-dining-kitchen",
        alt: "Open living and dining area with a marble TV wall and the kitchen beyond",
      },
      {
        token: "641243651",
        name: "kitchen-breakfast-bar",
        alt: "Open kitchen with a wood breakfast bar and lantern pendant lights",
      },
      {
        token: "640390998",
        name: "carport",
        alt: "Two-car carport with a patterned stone floor and a wood-panelled wall",
      },
      {
        token: "640389791",
        name: "living-room",
        alt: "Living room with wood flooring, a ceiling fan and a sliding glass door",
      },
      {
        token: "641476610",
        name: "bedroom-wardrobe",
        alt: "Bedroom with a built-in wardrobe, a wall-mounted TV panel and wood flooring",
      },
      {
        token: "641462442",
        name: "second-floor-common-area",
        alt: "Second-floor common area with a ceiling fan and a stair railing",
      },
      {
        token: "641135016",
        name: "balcony",
        alt: "Balcony with a glass railing and a view over the neighbourhood",
      },
      {
        token: "641397342",
        name: "bathroom-shower",
        alt: "Bathroom with a dark marble-effect shower wall and a vessel basin",
      },
      {
        token: "641399967",
        name: "staircase",
        alt: "Staircase with a wood handrail, a window and lantern pendant lights",
      },
    ],
  },
];
