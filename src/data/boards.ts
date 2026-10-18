import type { Locale } from "../i18n";

// The board in the hero, as a Coachboard share link per language (brief, "Links").
// The link is the contract: the hero button opens it now, and from phase 4 the
// board itself is decoded from it at build time.
export const boards: Record<Locale, string> = {
  nl: "https://handballcoachboard.com/nl/board/#t=2.tZBBi8MgFIT_ysPzUHxubMx5L4VNCOxVPLipNKFuWpL0_y-atHRhj9uDzDg-9WOshBCwVkLUB-GQTbuZ5m4-H-Y-814nwxAfWf9cDtbBWmtQGLxJMBuwlODky21fqXSa4v0-i4FSabow0AZmzdUqWqWMy_Rc-oIlWCmX-RVKjUo7l7jp5P1C32GhY6AvH2nu-tsw0uj9RHEYz_Mucf9Cy9f_B8xomHLFYjBrsMxgdUvn6TbMC_muX8JETUvRj6dnmm38JTgM9YzTtDRfQ4iPlnI9dftaGlYaVcYpUjtbL3PXD2Ghy5WOlxB3wjn3Aw",
  en: "https://handballcoachboard.com/en/board/#t=2.tZFBS8QwEIX_ytDzQzKx2abX9uDBHsSLh5BD1q1toWzEBMR_L5N2ZQWP7iG8l5eZ5GPiFKoKzilUw0vlUUy3m_5inn_MpeZJlFE9PBbz5_JwHs45i9riXoHZgpUCi2_2favlVOLDoYiF1lJdWxgLu-V6E6Ml40aukydYgbX2hV-jMWiN98JNUxwTnZYwxXNY1y9ax7dMn0ueKc8jHcO63gn4L7bS_z9k1sA2GxeD2YBVIRs6ev2IKY2JjuO8nE_Ud1cge-VNSBj6mqTv6D0UkBxpuDEEa4O2UNQyj30SaY4xJwqZphjkP7z_Bg",
};
