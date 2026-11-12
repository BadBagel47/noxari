import type {SpaceObject} from './data';

/** F-032: the ISS as a selectable sky object; its position comes from src/iss.ts. */
export const issObject: SpaceObject = {
  id: 'iss', en: 'International Space Station (ISS)', sv: 'Internationella rymdstationen (ISS)', kind: 'Satellite', constellation: 'Varies',
  distance: 'About 420 km above Earth', distanceSv: 'Cirka 420 km över jorden', magnitude: 'Up to about −3.5 when sunlit', magnitudeSv: 'Upp till cirka −3,5 när den är solbelyst',
  gear: 'eye',
  description: 'The crewed space station orbits Earth about every 92 minutes. It is visible to the naked eye as a bright, steady point moving across the sky when it is sunlit while your sky is dark. Positions use CelesTrak orbital elements (SGP4); accuracy drops after a few days.',
  descriptionSv: 'Den bemannade rymdstationen kretsar runt jorden ungefär var 92:a minut. Den syns för blotta ögat som en ljus, stadig punkt som rör sig över himlen när den är solbelyst och din himmel är mörk. Positioner beräknas från CelesTraks banelement (SGP4); noggrannheten sjunker efter några dagar.',
  position: {kind: 'satellite'}, color: '#d0d8e4', size: 3, aliases: ['ISS', 'Zarya', '25544'],
  references: [{label: 'CelesTrak GP data', url: 'https://celestrak.org/NORAD/elements/'}],
};
