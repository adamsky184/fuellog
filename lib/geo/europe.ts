/**
 * v2.12.0 — simplified European country outlines.
 *
 * 1000 × 700 viewBox. Each path is a polygon of 6–14 points — enough
 * to make the country recognisable (think infographic style) without
 * shipping kilobytes of cartographically accurate borders. Position
 * relationships are roughly correct (Germany central, Poland east of
 * Germany, Italy south, Spain southwest, …).
 *
 * Coverage: every country FuelLog supports in `FOREIGN_COUNTRIES`
 * plus CZ as the host market.
 */

export type CountryPath = {
  code: string;
  label: string;
  d: string;
  centroid: [number, number];
};

export const EUROPE_VIEWBOX = "0 0 1000 700";

export const EUROPE_COUNTRY_PATHS: CountryPath[] = [
  {
    code: "GB",
    label: "Velká Británie",
    d: "M 200 130 L 260 100 L 280 180 L 320 230 L 280 290 L 220 290 L 190 240 L 200 180 Z",
    centroid: [245, 200],
  },
  {
    code: "IE",
    label: "Irsko",
    d: "M 110 200 L 180 200 L 180 280 L 110 280 Z",
    centroid: [145, 240],
  },
  {
    code: "PT",
    label: "Portugalsko",
    d: "M 220 480 L 280 480 L 270 580 L 220 580 Z",
    centroid: [250, 530],
  },
  {
    code: "ES",
    label: "Španělsko",
    d: "M 220 470 L 420 460 L 430 580 L 280 600 L 220 580 Z",
    centroid: [330, 530],
  },
  {
    code: "FR",
    label: "Francie",
    d: "M 290 280 L 420 280 L 460 380 L 460 460 L 420 460 L 320 460 L 280 380 Z",
    centroid: [380, 380],
  },
  {
    code: "BE",
    label: "Belgie",
    d: "M 410 280 L 470 270 L 480 320 L 420 330 Z",
    centroid: [445, 300],
  },
  {
    code: "NL",
    label: "Nizozemsko",
    d: "M 460 240 L 530 230 L 530 290 L 470 290 Z",
    centroid: [495, 260],
  },
  {
    code: "DE",
    label: "Německo",
    d: "M 470 230 L 600 220 L 620 360 L 540 380 L 470 380 L 460 320 Z",
    centroid: [540, 300],
  },
  {
    code: "DK",
    label: "Dánsko",
    d: "M 520 170 L 580 170 L 580 220 L 520 220 Z",
    centroid: [550, 195],
  },
  {
    code: "CH",
    label: "Švýcarsko",
    d: "M 460 380 L 540 380 L 540 430 L 470 430 Z",
    centroid: [500, 405],
  },
  {
    code: "AT",
    label: "Rakousko",
    d: "M 540 380 L 700 370 L 720 430 L 600 440 L 540 430 Z",
    centroid: [620, 405],
  },
  {
    code: "CZ",
    label: "Česko",
    d: "M 600 320 L 720 320 L 720 370 L 700 370 L 540 380 L 540 360 L 600 360 Z",
    centroid: [630, 350],
  },
  {
    code: "SK",
    label: "Slovensko",
    d: "M 720 320 L 830 320 L 830 380 L 720 380 Z",
    centroid: [775, 350],
  },
  {
    code: "PL",
    label: "Polsko",
    d: "M 600 220 L 830 200 L 830 320 L 720 320 L 600 320 Z",
    centroid: [710, 270],
  },
  {
    code: "HU",
    label: "Maďarsko",
    d: "M 720 380 L 870 380 L 870 440 L 720 440 L 720 410 Z",
    centroid: [795, 410],
  },
  {
    code: "SI",
    label: "Slovinsko",
    d: "M 600 440 L 680 440 L 680 480 L 600 480 Z",
    centroid: [640, 460],
  },
  {
    code: "HR",
    label: "Chorvatsko",
    d: "M 600 480 L 720 480 L 740 560 L 660 580 L 600 540 Z",
    centroid: [670, 520],
  },
  {
    code: "IT",
    label: "Itálie",
    d: "M 470 430 L 580 440 L 600 530 L 540 600 L 480 580 L 470 500 Z",
    centroid: [530, 510],
  },
  {
    code: "NO",
    label: "Norsko",
    d: "M 540 60 L 580 50 L 600 170 L 560 170 L 530 110 Z",
    centroid: [565, 110],
  },
  {
    code: "SE",
    label: "Švédsko",
    d: "M 600 50 L 660 50 L 670 200 L 620 220 L 600 170 Z",
    centroid: [635, 130],
  },
  {
    code: "FI",
    label: "Finsko",
    d: "M 670 50 L 770 60 L 780 200 L 690 200 Z",
    centroid: [725, 130],
  },
];
