/**
 * v2.14.4 — Prague postal districts P1–P10 as hand-crafted SVG paths.
 *
 * These are NOT pixel-perfect Natural-Earth-style outlines (no public
 * GeoJSON of P1-P10 was reachable from the build sandbox). Instead each
 * district is drawn from memory of its actual geographic extent:
 *
 *   P1 — historic core, Old Town + Lesser Town, Vltava bisects it
 *   P2 — Vinohrady-west / Vyšehrad, between Vltava (W) and Vinohrady (E)
 *   P3 — Žižkov, hill east of P1, runs to Olšany
 *   P4 — huge southern district, Nusle / Pankrác / Krč / Modřany
 *   P5 — Smíchov / Košíře / Motol, large west of Vltava
 *   P6 — Dejvice / Bubeneč / Břevnov, north-west, large
 *   P7 — Holešovice / Letná, river bend north of P1
 *   P8 — Karlín / Libeň / Kobylisy / Bohnice, large NE
 *   P9 — Vysočany / Prosek / Letňany, far east
 *   P10 — Vršovice / Strašnice / Záběhlice / Hostivař, SE
 *
 * 800 × 600 viewBox. The Vltava follows roughly an S-curve through the
 * city (from N→S the river enters in P8/P7, swings west around P1, then
 * south through P2 / P4). I've drawn polygons that respect this rough
 * topology so neighbouring districts share borders along the river.
 */

export type DistrictPath = {
  code: string;
  label: string;
  d: string;
  centroid: [number, number];
};

export const PRAHA_VIEWBOX = "0 0 800 600";

export const PRAHA_DISTRICT_PATHS: DistrictPath[] = [
  // P1 — small historic core, both banks of Vltava, very irregular
  {
    code: "P1",
    label: "P1",
    d: "M 360 300 L 380 290 L 410 285 L 425 295 L 432 310 L 430 330 L 415 340 L 395 342 L 380 338 L 365 325 Z",
    centroid: [395, 315],
  },
  // P2 — Nové Město + Vinohrady-west, south of P1, both on east bank
  {
    code: "P2",
    label: "P2",
    d: "M 395 342 L 415 340 L 460 345 L 470 380 L 460 410 L 420 415 L 395 405 L 388 380 Z",
    centroid: [428, 380],
  },
  // P3 — Žižkov, narrow strip east of P1/P2 stretching to Olšany
  {
    code: "P3",
    label: "P3",
    d: "M 432 310 L 470 305 L 520 310 L 555 330 L 545 360 L 510 365 L 470 360 L 460 345 L 460 320 Z",
    centroid: [500, 335],
  },
  // P4 — large south, Nusle/Pankrác/Krč/Modřany down to city limits
  {
    code: "P4",
    label: "P4",
    d: "M 388 405 L 460 410 L 510 415 L 545 440 L 555 490 L 540 540 L 480 555 L 410 550 L 355 530 L 340 480 L 360 440 Z",
    centroid: [450, 480],
  },
  // P5 — Smíchov + Košíře + Motol, west of river, large
  {
    code: "P5",
    label: "P5",
    d: "M 250 350 L 360 340 L 380 360 L 360 410 L 355 470 L 320 490 L 260 480 L 215 450 L 200 400 L 215 365 Z",
    centroid: [285, 415],
  },
  // P6 — Dejvice + Bubeneč + Břevnov, NW, very large
  {
    code: "P6",
    label: "P6",
    d: "M 110 200 L 170 175 L 280 170 L 350 195 L 360 270 L 350 340 L 280 350 L 215 340 L 165 320 L 115 280 L 95 235 Z",
    centroid: [225, 260],
  },
  // P7 — Holešovice / Letná, in the river bend, north of P1
  {
    code: "P7",
    label: "P7",
    d: "M 350 195 L 410 200 L 445 215 L 450 250 L 430 285 L 395 290 L 365 285 L 360 250 L 360 215 Z",
    centroid: [400, 245],
  },
  // P8 — Karlín / Libeň / Kobylisy / Bohnice, large NE arm
  {
    code: "P8",
    label: "P8",
    d: "M 410 200 L 470 180 L 555 175 L 600 195 L 620 240 L 595 280 L 545 300 L 500 295 L 470 285 L 450 250 L 445 215 Z",
    centroid: [525, 235],
  },
  // P9 — Vysočany / Prosek / Letňany, east edge
  {
    code: "P9",
    label: "P9",
    d: "M 555 175 L 660 180 L 720 200 L 730 280 L 700 320 L 640 320 L 595 305 L 595 280 L 620 240 L 600 195 Z",
    centroid: [665, 245],
  },
  // P10 — Vršovice / Strašnice / Záběhlice / Hostivař, SE
  {
    code: "P10",
    label: "P10",
    d: "M 545 360 L 595 350 L 660 355 L 700 380 L 705 440 L 670 475 L 600 480 L 555 470 L 545 440 L 510 415 L 545 380 Z",
    centroid: [610, 410],
  },
];
