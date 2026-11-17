declare module "virtual:psi-facts" {
  export const componentCount: number;
  export const iconCount: number;
  export const patternCount: number;
  export const version: string;
  export const decisionCount: number;
  export const releaseVersion: string;
  export const releaseDate: string;
  export const componentNames: string[];
  export const iconNames: string[];
  export const storyTitles: Record<string, string>;
}
