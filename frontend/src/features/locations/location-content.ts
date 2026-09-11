import { publicLocationSlug } from "../../lib/public-location";

export interface LocationScenery {
  title: string;
  caption: string;
  imagePath: string;
  alt: string;
  creator: string;
  sourceUrl: string;
  license: string;
  licenseUrl?: string;
}

export interface LocationEditorialContent {
  slug: string;
  locality: string;
  classification: "City" | "Municipality";
  scenery: LocationScenery;
}

const PUBLIC_DOMAIN = "https://creativecommons.org/publicdomain/mark/1.0/deed.en";
const CC0 = "https://creativecommons.org/publicdomain/zero/1.0/deed.en";
const CC_BY_3 = "https://creativecommons.org/licenses/by/3.0";
const CC_BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0";

export const LOCATION_EDITORIAL_CONTENT = [
  {
    slug: "angeles-city",
    locality: "Angeles City",
    classification: "City",
    scenery: {
      title: "Balibago skyline at sunset",
      caption: "The Angeles City skyline with Mount Arayat on the horizon.",
      imagePath: "/images/locations/angeles-city.jpg",
      alt: "Angeles City skyline and Mount Arayat beneath a pale sunset sky",
      creator: "Patrickroque01",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Angeles_City_Balibago_skyline_sunset_(Angeles,_Pampanga;_05-27-2023).jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "apalit",
    locality: "Apalit",
    classification: "Municipality",
    scenery: {
      title: "Sulipan riverside",
      caption: "A riverside view in Sulipan, Apalit.",
      imagePath: "/images/locations/apalit.jpg",
      alt: "Calm river bordered by grasses and homes in Sulipan, Apalit",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:01812jfOld_New_Rivers_Landscape_Sulipan_Apalit_Pampanga_Bridgesfvf_14.JPG",
      license: "Public domain",
      licenseUrl: PUBLIC_DOMAIN,
    },
  },
  {
    slug: "arayat",
    locality: "Arayat",
    classification: "Municipality",
    scenery: {
      title: "Arayat-Magalang Road",
      caption: "A residential stretch of the Arayat-Magalang Road.",
      imagePath: "/images/locations/arayat.jpg",
      alt: "Tree-lined residential road in Arayat beneath a bright clouded sky",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:9887Mexico_Arayat_Magalang_Road,_Pampanga_06.jpg",
      license: "CC0 1.0",
      licenseUrl: CC0,
    },
  },
  {
    slug: "bacolor",
    locality: "Bacolor",
    classification: "Municipality",
    scenery: {
      title: "Macabacle barangay road",
      caption: "The barangay road through Macabacle, Bacolor.",
      imagePath: "/images/locations/bacolor.jpg",
      alt: "Quiet barangay road beside open grassland in Macabacle, Bacolor",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:02071jfMacabacle_Bacolor_Pampanga_Day_Care_Grass_Olongapo_Gapan_Roadfvf_12.JPG",
      license: "Public domain",
      licenseUrl: PUBLIC_DOMAIN,
    },
  },
  {
    slug: "candaba",
    locality: "Candaba",
    classification: "Municipality",
    scenery: {
      title: "Pansinao countryside",
      caption: "Fields and vegetation beside a barangay road in Pansinao, Candaba.",
      imagePath: "/images/locations/candaba.jpg",
      alt: "Green fields and rural homes in Pansinao, Candaba",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:06233jfBarangay_Road_Pansinao_Candaba_Mount_Arayat_Pampanga_Riverfvf_08.JPG",
      license: "Public domain",
      licenseUrl: PUBLIC_DOMAIN,
    },
  },
  {
    slug: "floridablanca",
    locality: "Floridablanca",
    classification: "Municipality",
    scenery: {
      title: "Santo Rosario rice fields",
      caption: "Flooded rice fields in Santo Rosario, Floridablanca.",
      imagePath: "/images/locations/floridablanca.jpg",
      alt: "Flooded rice fields framed by a large tree in Floridablanca",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:8272Floridablanca_Pampanga_Roads_Barangays_08.jpg",
      license: "CC0 1.0",
      licenseUrl: CC0,
    },
  },
  {
    slug: "guagua",
    locality: "Guagua",
    classification: "Municipality",
    scenery: {
      title: "Guagua Road",
      caption: "Everyday street life along Guagua Road.",
      imagePath: "/images/locations/guagua.jpg",
      alt: "A leafy residential and commercial street along Guagua Road",
      creator: "Ralff Nestor Nacor",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Guagua_Road,_Guagua,_Pampanga,_Aug_2025_(1).jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "lubao",
    locality: "Lubao",
    classification: "Municipality",
    scenery: {
      title: "Lubao-Sasmuan Road wetlands",
      caption: "A waterside view from the Lubao-Sasmuan Road.",
      imagePath: "/images/locations/lubao.jpg",
      alt: "Open water and blue sky viewed from the Lubao-Sasmuan Road",
      creator: "Ralff Nestor Nacor",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:View_from_Lubao-Sasmuan_Road,_Lubao,_Pampanga,_Jan_2026.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "mabalacat-city",
    locality: "Mabalacat City",
    classification: "City",
    scenery: {
      title: "Bical road and Mount Arayat",
      caption: "A road through Bical, Mabalacat City, with Mount Arayat ahead.",
      imagePath: "/images/locations/mabalacat-city.jpg",
      alt: "Road through Bical in Mabalacat City with Mount Arayat in the distance",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:00111jfCamachiles_Sapang_Biabas_Bical_Roads_City_Pampangafvf_09.JPG",
      license: "Public domain",
      licenseUrl: PUBLIC_DOMAIN,
    },
  },
  {
    slug: "macabebe",
    locality: "Macabebe",
    classification: "Municipality",
    scenery: {
      title: "Telacsan-Tacasan road",
      caption: "A residential road in the Telacsan-Tacasan area of Macabebe.",
      imagePath: "/images/locations/macabebe.jpg",
      alt: "Homes, trees, and a tricycle beside a road in Macabebe",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:0036jfRiverside_Rice_Fields_Roads_Tacasan_Telacsan_Macabebe_Pampangafvf_16.JPG",
      license: "Public domain",
      licenseUrl: PUBLIC_DOMAIN,
    },
  },
  {
    slug: "magalang",
    locality: "Magalang",
    classification: "Municipality",
    scenery: {
      title: "San Ildefonso school road",
      caption: "Students walking along San Ildefonso Road in Magalang.",
      imagePath: "/images/locations/magalang.jpg",
      alt: "Students walking beside a colorful school wall on San Ildefonso Road, Magalang",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:7685San_Ildefonso_Escaler_Magalang,_Pampanga_44.jpg",
      license: "Public domain",
      licenseUrl: PUBLIC_DOMAIN,
    },
  },
  {
    slug: "masantol",
    locality: "Masantol",
    classification: "Municipality",
    scenery: {
      title: "Masantol fishponds",
      caption: "Fishponds and homes in Masantol's lowland landscape.",
      imagePath: "/images/locations/masantol.jpg",
      alt: "A broad fishpond bordered by homes and palms in Masantol",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:08668jfLandscape_Fishponds_Fields_Masantol_Pampanga_Roadfvf_14.JPG",
      license: "Public domain",
      licenseUrl: PUBLIC_DOMAIN,
    },
  },
  {
    slug: "mexico",
    locality: "Mexico",
    classification: "Municipality",
    scenery: {
      title: "San Miguel rice fields",
      caption: "Rice fields in San Miguel, Mexico, with Mount Arayat beyond.",
      imagePath: "/images/locations/mexico.jpg",
      alt: "Green rice fields and Mount Arayat in Mexico, Pampanga",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Jf367SanMiguel%26SanVicenteMexicoPampangafvf.JPG",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "minalin",
    locality: "Minalin",
    classification: "Municipality",
    scenery: {
      title: "Dawe riverside road",
      caption: "A small bridge and village road in Dawe, Minalin.",
      imagePath: "/images/locations/minalin.jpg",
      alt: "A small concrete bridge and village home in Dawe, Minalin",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:02600jfRiverside_Landscapes_Roads_River_Dawe_Minalin_Pampanga_villagesfvf_01.JPG",
      license: "Public domain",
      licenseUrl: PUBLIC_DOMAIN,
    },
  },
  {
    slug: "porac",
    locality: "Porac",
    classification: "Municipality",
    scenery: {
      title: "Jose Abad Santos Avenue",
      caption: "Traffic and daily activity along Jose Abad Santos Avenue in Porac.",
      imagePath: "/images/locations/porac.jpg",
      alt: "Vehicles and roadside activity along Jose Abad Santos Avenue in Porac",
      creator: "Ralff Nestor Nacor",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Jose_Abad_Santos_Road,_Porac,_Pampanga,_Aug_2025.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "city-of-san-fernando",
    locality: "City of San Fernando",
    classification: "City",
    scenery: {
      title: "Mount Arayat from San Fernando",
      caption: "Mount Arayat seen across fields in the City of San Fernando.",
      imagePath: "/images/locations/city-of-san-fernando.jpg",
      alt: "Mount Arayat rising behind green fields in the City of San Fernando",
      creator: "Shioan",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Mt_Arayat.JPG",
      license: "CC BY 3.0",
      licenseUrl: CC_BY_3,
    },
  },
  {
    slug: "san-luis",
    locality: "San Luis",
    classification: "Municipality",
    scenery: {
      title: "San Isidro road",
      caption: "A residential road in San Isidro, San Luis.",
      imagePath: "/images/locations/san-luis.jpg",
      alt: "A wide residential road with homes and palms in San Luis",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:01008jfSan_Isidro_Santa_Monica_Candaba_San_Luis_Pampanga_Welcome_Roadsfvf_06.JPG",
      license: "Public domain",
      licenseUrl: PUBLIC_DOMAIN,
    },
  },
  {
    slug: "san-simon",
    locality: "San Simon",
    classification: "Municipality",
    scenery: {
      title: "Concepcion rice fields",
      caption: "Flooded rice fields beside Cortez Road in Concepcion, San Simon.",
      imagePath: "/images/locations/san-simon.jpg",
      alt: "Flooded rice fields under a clear blue sky in San Simon",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:02912jfPaddy_fields_grasslands_trees_Goats_Cortez_Road_Concepcion_San_Simon_Pampangafvf_10.jpg",
      license: "Public domain",
      licenseUrl: PUBLIC_DOMAIN,
    },
  },
  {
    slug: "santa-ana",
    locality: "Santa Ana",
    classification: "Municipality",
    scenery: {
      title: "San Nicolas barangay road",
      caption: "A shaded barangay road in San Nicolas, Santa Ana.",
      imagePath: "/images/locations/santa-ana.jpg",
      alt: "A tree-lined barangay road in San Nicolas, Santa Ana",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:1377San_Nicolas_barangay_road,_Santa_Ana,_Pampanga_50.jpg",
      license: "CC0 1.0",
      licenseUrl: CC0,
    },
  },
  {
    slug: "santa-rita",
    locality: "Santa Rita",
    classification: "Municipality",
    scenery: {
      title: "Becuran street life",
      caption: "Residents and tricycles along a local road in Becuran, Santa Rita.",
      imagePath: "/images/locations/santa-rita.jpg",
      alt: "Residents, tricycles, and shade trees along a road in Santa Rita",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Jf6074Santa_Rita_Becuran_Roads_Pampangafvf_05.JPG",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "santo-tomas",
    locality: "Santo Tomas",
    classification: "Municipality",
    scenery: {
      title: "San Bartolome wetlands",
      caption: "Wetland vegetation and open fields in San Bartolome, Santo Tomas.",
      imagePath: "/images/locations/santo-tomas.jpg",
      alt: "Wetland plants and open fields in Santo Tomas, Pampanga",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:0051jfSan_Bartolome_Culcul_Santo_Tomas,_Pampanga_Roads_Farmsfvf_35.jpg",
      license: "CC0 1.0",
      licenseUrl: CC0,
    },
  },
  {
    slug: "sasmuan",
    locality: "Sasmuan",
    classification: "Municipality",
    scenery: {
      title: "Sasmuan river district",
      caption: "Open water in one of Sasmuan's river districts.",
      imagePath: "/images/locations/sasmuan.jpg",
      alt: "Broad blue water bordered by low green vegetation in Sasmuan",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Sasmuan_Landmarks_Pampanga_River_Districts_05.jpg",
      license: "CC0 1.0",
      licenseUrl: CC0,
    },
  },
] as const satisfies readonly LocationEditorialContent[];

const contentBySlug = new Map<string, LocationEditorialContent>(
  LOCATION_EDITORIAL_CONTENT.map((content) => [content.slug, content]),
);

export function getLocationEditorialContent(
  location: string,
): LocationEditorialContent | undefined {
  return contentBySlug.get(publicLocationSlug(location));
}
