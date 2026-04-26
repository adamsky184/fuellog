/**
 * v2.12.0 — Prague districts P1–P10 as simplified SVG paths.
 *
 * Real Prague districts have very irregular outlines (P4 alone is huge,
 * P1 is the small core, P5 wraps around the river…). The shapes below
 * are stylised: each district is a wedge or block sitting around the
 * historic centre. Topology is roughly correct (P1 in the middle, P6
 * to the west, P9 to the east, …) so users can quickly see "kde
 * tankuju nejvíc".
 *
 * 800 × 600 viewBox.
 */

export type DistrictPath = {
  code: string;
  label: string;
  d: string;
  centroid: [number, number];
};

export const PRAHA_VIEWBOX = "0 0 800 600";

export const PRAHA_DISTRICT_PATHS: DistrictPath[] = [
  // P1 — small historic core in the centre
  {
    code: "P1",
    label: "P1",
    d: "M 370 280 L 430 280 L 440 320 L 380 330 L 360 310 Z",
    centroid: [400, 305],
  },
  // P2 — south of P1
  {
    code: "P2",
    label: "P2",
    d: "M 380 330 L 440 320 L 450 380 L 380 390 Z",
    centroid: [410, 360],
  },
  // P3 — east of P1
  {
    code: "P3",
    label: "P3",
    d: "M 440 280 L 510 270 L 520 340 L 450 330 Z",
    centroid: [480, 305],
  },
  // P4 — south, large
  {
    code: "P4",
    label: "P4",
    d: "M 380 390 L 540 380 L 560 480 L 400 510 L 350 460 Z",
    centroid: [460, 440],
  },
  // P5 — west / southwest
  {
    code: "P5",
    label: "P5",
    d: "M 200 360 L 360 310 L 380 390 L 350 460 L 240 480 L 170 420 Z",
    centroid: [280, 410],
  },
  // P6 — west / northwest
  {
    code: "P6",
    label: "P6",
    d: "M 100 200 L 280 190 L 360 280 L 360 310 L 200 360 L 120 320 Z",
    centroid: [220, 270],
  },
  // P7 — north
  {
    code: "P7",
    label: "P7",
    d: "M 280 150 L 430 150 L 440 230 L 360 280 L 280 190 Z",
    centroid: [360, 210],
  },
  // P8 — north / northeast
  {
    code: "P8",
    label: "P8",
    d: "M 430 150 L 580 130 L 600 230 L 510 270 L 440 230 Z",
    centroid: [510, 200],
  },
  // P9 — northeast / east
  {
    code: "P9",
    label: "P9",
    d: "M 580 130 L 720 150 L 700 290 L 600 290 L 600 230 Z",
    centroid: [650, 220],
  },
  // P10 — east / southeast
  {
    code: "P10",
    label: "P10",
    d: "M 540 380 L 700 290 L 720 410 L 620 470 L 560 460 Z",
    centroid: [630, 380],
  },
];
