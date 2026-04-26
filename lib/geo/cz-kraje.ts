/**
 * v2.12.0 — Czech kraje as simplified SVG paths.
 *
 * Coordinates live in a 1000 × 600 viewBox roughly matching the
 * country's W-E vs N-S aspect ratio. Paths are intentionally
 * simplified (8–14 points per kraj) — enough to make each region
 * recognisable without bloating the bundle. Praha sits inside STC.
 *
 * `centroid` is the (x, y) point we render the kraj label at.
 */

export type KrajPath = {
  code: string;
  label: string;
  d: string;
  centroid: [number, number];
};

export const CZ_VIEWBOX = "0 0 1000 600";

export const CZ_KRAJE_PATHS: KrajPath[] = [
  {
    code: "KVK",
    label: "Karlovarský",
    d: "M 60 130 L 220 110 L 230 200 L 180 230 L 80 220 Z",
    centroid: [145, 175],
  },
  {
    code: "ULK",
    label: "Ústecký",
    d: "M 220 90 L 430 70 L 440 170 L 360 200 L 230 200 L 220 110 Z",
    centroid: [330, 140],
  },
  {
    code: "LBK",
    label: "Liberecký",
    d: "M 430 60 L 560 60 L 570 150 L 470 170 L 440 160 L 430 80 Z",
    centroid: [495, 110],
  },
  {
    code: "HKK",
    label: "Královéhradecký",
    d: "M 560 70 L 680 90 L 700 200 L 620 240 L 570 230 L 570 150 Z",
    centroid: [620, 160],
  },
  {
    code: "PAK",
    label: "Pardubický",
    d: "M 570 230 L 700 200 L 730 290 L 660 330 L 580 310 L 560 260 Z",
    centroid: [640, 270],
  },
  {
    code: "PLK",
    label: "Plzeňský",
    d: "M 80 230 L 240 220 L 280 280 L 290 410 L 200 460 L 90 420 L 70 320 Z",
    centroid: [180, 340],
  },
  {
    code: "STC",
    label: "Středočeský",
    d: "M 240 200 L 360 200 L 440 170 L 470 240 L 480 320 L 430 380 L 350 400 L 290 400 L 280 290 Z",
    centroid: [380, 290],
  },
  // Praha is a small inset inside Středočeský.
  {
    code: "P",
    label: "Praha",
    d: "M 360 270 a 28 22 0 1 0 56 0 a 28 22 0 1 0 -56 0 Z",
    centroid: [388, 270],
  },
  {
    code: "JCK",
    label: "Jihočeský",
    d: "M 200 460 L 290 410 L 430 380 L 450 480 L 360 540 L 230 540 L 180 480 Z",
    centroid: [320, 470],
  },
  {
    code: "VYS",
    label: "Vysočina",
    d: "M 430 380 L 480 320 L 580 310 L 600 410 L 530 460 L 450 470 Z",
    centroid: [510, 400],
  },
  {
    code: "JMK",
    label: "Jihomoravský",
    d: "M 450 470 L 600 410 L 700 420 L 720 510 L 600 540 L 470 530 Z",
    centroid: [590, 480],
  },
  {
    code: "OLK",
    label: "Olomoucký",
    d: "M 660 290 L 800 270 L 820 380 L 730 410 L 700 410 L 670 350 Z",
    centroid: [740, 340],
  },
  {
    code: "ZLK",
    label: "Zlínský",
    d: "M 720 410 L 820 380 L 870 460 L 800 510 L 720 510 L 700 440 Z",
    centroid: [790, 450],
  },
  {
    code: "MSK",
    label: "Moravskoslezský",
    d: "M 700 200 L 880 180 L 940 290 L 920 380 L 820 370 L 800 270 L 720 270 Z",
    centroid: [840, 270],
  },
];
