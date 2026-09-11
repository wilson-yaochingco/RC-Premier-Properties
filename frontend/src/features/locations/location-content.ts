import { publicLocationSlug } from "../../lib/public-location";

export interface LocationLandmark {
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
  landmark: LocationLandmark;
}

const CC0 = "https://creativecommons.org/publicdomain/zero/1.0/deed.en";
const CC_BY_SA_3 = "https://creativecommons.org/licenses/by-sa/3.0";
const CC_BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0";

export const LOCATION_EDITORIAL_CONTENT = [
  {
    slug: "angeles-city",
    locality: "Angeles City",
    classification: "City",
    landmark: {
      title: "Holy Rosary Parish Church",
      caption: "The Holy Rosary Parish Church in Angeles City.",
      imagePath: "/images/locations/angeles-city.jpg",
      alt: "Facade of the Holy Rosary Parish Church in Angeles City",
      creator: "Ramon FVelasquez",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Holy_Rosary_Parish_Church_(Angeles_City,_Pampanga).jpg",
      license: "CC BY-SA 3.0",
      licenseUrl: CC_BY_SA_3,
    },
  },
  {
    slug: "apalit",
    locality: "Apalit",
    classification: "Municipality",
    landmark: {
      title: "Nuestra Señora del Rosario Chapel",
      caption: "The Apung Maria chapel in Cansinala, Apalit.",
      imagePath: "/images/locations/apalit.jpg",
      alt: "Nuestra Señora del Rosario chapel in Cansinala, Apalit",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:09318jfNuestra_Se%C3%B1ora_del_Rosario_Apung_Maria_Chapel_Cansinala_Apalit_Pampangafvf_08.jpg",
      license: "CC0 1.0",
      licenseUrl: CC0,
    },
  },
  {
    slug: "arayat",
    locality: "Arayat",
    classification: "Municipality",
    landmark: {
      title: "Saint Catherine of Alexandria Parish Church",
      caption: "The parish church in Arayat town center.",
      imagePath: "/images/locations/arayat.jpg",
      alt: "Saint Catherine of Alexandria Parish Church in Arayat",
      creator: "Joelaldor",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Arayat_Church,_Pampanga.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "bacolor",
    locality: "Bacolor",
    classification: "Municipality",
    landmark: {
      title: "San Guillermo Parish Church",
      caption: "The San Guillermo Parish Church in Bacolor.",
      imagePath: "/images/locations/bacolor.jpg",
      alt: "San Guillermo Parish Church in Bacolor",
      creator: "Elmer B. Domingo",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Bacolor_Church,_Pampanga.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "candaba",
    locality: "Candaba",
    classification: "Municipality",
    landmark: {
      title: "Saint Andrew the Apostle Parish Church",
      caption: "The Saint Andrew the Apostle Parish Church in Candaba.",
      imagePath: "/images/locations/candaba.jpg",
      alt: "Saint Andrew the Apostle Parish Church in Candaba",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:09817jfSaint_Andrew_the_Apostle_Parish_Church_Candaba_Pampangafvf_02.jpg",
      license: "CC0 1.0",
      licenseUrl: CC0,
    },
  },
  {
    slug: "floridablanca",
    locality: "Floridablanca",
    classification: "Municipality",
    landmark: {
      title: "Saint Joseph the Worker Parish Church",
      caption: "The Saint Joseph the Worker Parish Church in Floridablanca.",
      imagePath: "/images/locations/floridablanca.jpg",
      alt: "Saint Joseph the Worker Parish Church in Floridablanca",
      creator: "Ramon FVelasquez",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Floridablancapampangajfhh.JPG",
      license: "CC BY-SA 3.0",
      licenseUrl: CC_BY_SA_3,
    },
  },
  {
    slug: "guagua",
    locality: "Guagua",
    classification: "Municipality",
    landmark: {
      title: "Immaculate Conception Parish Church",
      caption: "The Immaculate Conception Parish Church in Guagua.",
      imagePath: "/images/locations/guagua.jpg",
      alt: "Immaculate Conception Parish Church in Guagua",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:9114Immaculate_Conception_Church_Guagua_Pampanga_01.jpg",
      license: "CC0 1.0",
      licenseUrl: CC0,
    },
  },
  {
    slug: "lubao",
    locality: "Lubao",
    classification: "Municipality",
    landmark: {
      title: "Saint Augustine Parish Church",
      caption: "The Saint Augustine Parish Church in Lubao.",
      imagePath: "/images/locations/lubao.jpg",
      alt: "Saint Augustine Parish Church in Lubao",
      creator: "Elmer B. Domingo",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lubao_Church.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "mabalacat-city",
    locality: "Mabalacat City",
    classification: "City",
    landmark: {
      title: "Our Lady of Divine Grace Parish Church",
      caption: "The Our Lady of Divine Grace Parish Church in Mabalacat City.",
      imagePath: "/images/locations/mabalacat-city.jpg",
      alt: "Our Lady of Divine Grace Parish Church in Mabalacat City",
      creator: "Pancit Canton Media",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Our_Lady_of_Grace_Parish_Church,_Mabalacat_City,_Pampanga,_Philippines_(8).jpg",
      license: "CC0 1.0",
      licenseUrl: CC0,
    },
  },
  {
    slug: "macabebe",
    locality: "Macabebe",
    classification: "Municipality",
    landmark: {
      title: "San Nicolas de Tolentino Parish Church",
      caption: "The parish church in Macabebe town center.",
      imagePath: "/images/locations/macabebe.jpg",
      alt: "San Nicolas de Tolentino Parish Church in Macabebe",
      creator: "Ralff Nestor Nacor",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Macabebe_Church,_Pampanga,_Jun_2025_(1).jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "magalang",
    locality: "Magalang",
    classification: "Municipality",
    landmark: {
      title: "Magalang Town Plaza and San Bartolome Parish Church",
      caption: "The town plaza and parish church in Magalang.",
      imagePath: "/images/locations/magalang.jpg",
      alt: "Magalang Town Plaza and San Bartolome Parish Church",
      creator: "Ralff Nestor Nacor",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Magalang_Town_Plaza_%26_Church,_Pampanga,_May_2026.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "masantol",
    locality: "Masantol",
    classification: "Municipality",
    landmark: {
      title: "Saint Michael the Archangel Parish Church",
      caption: "The Saint Michael the Archangel Parish Church in Masantol.",
      imagePath: "/images/locations/masantol.jpg",
      alt: "Saint Michael the Archangel Parish Church in Masantol",
      creator: "Ralff Nestor Nacor",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Masantol_Church_Main_Entrance,_Pampanga,_Jun_2025.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "mexico",
    locality: "Mexico",
    classification: "Municipality",
    landmark: {
      title: "Saint Monica Parish Church",
      caption: "The Saint Monica Parish Church in Mexico, Pampanga.",
      imagePath: "/images/locations/mexico.jpg",
      alt: "Saint Monica Parish Church in Mexico, Pampanga",
      creator: "FBenjr123",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Saint_Monica_Parish_Church_Mexico_Pampanga_01.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "minalin",
    locality: "Minalin",
    classification: "Municipality",
    landmark: {
      title: "Santa Monica Parish Church",
      caption: "The Santa Monica Parish Church in Minalin.",
      imagePath: "/images/locations/minalin.jpg",
      alt: "Santa Monica Parish Church in Minalin",
      creator: "Lucky lleo",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Santa_Monica_Parish_Church_(Minalin_Church).jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "porac",
    locality: "Porac",
    classification: "Municipality",
    landmark: {
      title: "Santa Catalina de Alexandria Parish Church",
      caption: "The Santa Catalina de Alexandria Parish Church in Porac.",
      imagePath: "/images/locations/porac.jpg",
      alt: "Santa Catalina de Alexandria Parish Church in Porac",
      creator: "Ralff Nestor Nacor",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Porac_Church,_Pampanga,_Aug_2025_(1).jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "city-of-san-fernando",
    locality: "City of San Fernando",
    classification: "City",
    landmark: {
      title: "Pampanga Provincial Capitol",
      caption: "The Pampanga Provincial Capitol in the City of San Fernando.",
      imagePath: "/images/locations/city-of-san-fernando.jpg",
      alt: "Pampanga Provincial Capitol in the City of San Fernando",
      creator: "Patrickroque01",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Pampanga_Provincial_Capitol_(Capitol_Boulevard,_San_Fernando,_Pampanga;_05-27-2023).jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "san-luis",
    locality: "San Luis",
    classification: "Municipality",
    landmark: {
      title: "Saint Aloysius Gonzaga Parish Church",
      caption: "The Saint Aloysius Gonzaga Parish Church in San Luis.",
      imagePath: "/images/locations/san-luis.jpg",
      alt: "Saint Aloysius Gonzaga Parish Church in San Luis",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:02749jfTowers_Bells_Saint_Aloysius_Gonzaga_Church_San_Luis,_Pampangafvf_32.jpg",
      license: "CC0 1.0",
      licenseUrl: CC0,
    },
  },
  {
    slug: "san-simon",
    locality: "San Simon",
    classification: "Municipality",
    landmark: {
      title: "Nuestra Señora del Pilar Parish Church",
      caption: "The Nuestra Señora del Pilar Parish Church in San Simon.",
      imagePath: "/images/locations/san-simon.jpg",
      alt: "Nuestra Señora del Pilar Parish Church in San Simon",
      creator: "Judgefloro",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:FvfSanSimonChurch9458_01.JPG",
      license: "Public domain",
    },
  },
  {
    slug: "santa-ana",
    locality: "Santa Ana",
    classification: "Municipality",
    landmark: {
      title: "Santa Ana Parish Church",
      caption: "The parish church in Santa Ana, Pampanga.",
      imagePath: "/images/locations/santa-ana.jpg",
      alt: "Santa Ana Parish Church in Pampanga",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:01047jfSanta_Ana_Pampanga_Church_Landmarks_Roadsfvf_26.jpg",
      license: "CC0 1.0",
      licenseUrl: CC0,
    },
  },
  {
    slug: "santa-rita",
    locality: "Santa Rita",
    classification: "Municipality",
    landmark: {
      title: "Santa Rita Parish Church",
      caption: "The parish church in Santa Rita, Pampanga.",
      imagePath: "/images/locations/santa-rita.jpg",
      alt: "Santa Rita Parish Church in Pampanga",
      creator: "Elmer B. Domingo",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Sta_Rita_Church_Pampanga.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: CC_BY_SA_4,
    },
  },
  {
    slug: "santo-tomas",
    locality: "Santo Tomas",
    classification: "Municipality",
    landmark: {
      title: "Saint Matthias Parish Church",
      caption: "The Saint Matthias Parish Church in Santo Tomas.",
      imagePath: "/images/locations/santo-tomas.jpg",
      alt: "Saint Matthias Parish Church in Santo Tomas, Pampanga",
      creator: "Ramon FVelasquez",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Saint_Matthias_Church_in_Santo_Tomas,_Pampanga.jpg",
      license: "CC BY-SA 3.0",
      licenseUrl: CC_BY_SA_3,
    },
  },
  {
    slug: "sasmuan",
    locality: "Sasmuan",
    classification: "Municipality",
    landmark: {
      title: "Santo Rosario Parish Church",
      caption: "The Santo Rosario Parish Church in Malusac, Sasmuan.",
      imagePath: "/images/locations/sasmuan.jpg",
      alt: "Santo Rosario Parish Church in Malusac, Sasmuan",
      creator: "Judgefloro",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:500Santo_Rosario_Parish_Church_Malusac,_Sasmuan,_Pampanga_13.jpg",
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
