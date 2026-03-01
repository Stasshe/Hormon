export type TileLayer = 'lumen' | 'mucus' | 'epithelial';

export interface Tile {
  x: number;
  y: number;
  oxygen: number;
  pH: number;
  nutrient: number;
  bile: number;
  inflammation_local: number;
  capacityK: number;
  layer: TileLayer;
  zoneName: string;
}

export function createTile(x: number, y: number, layer: TileLayer, zoneName: string): Tile {
  return {
    x, y,
    oxygen: 0,
    pH: 7.0,
    nutrient: 0,
    bile: 0,
    inflammation_local: 0,
    capacityK: 1000,
    layer,
    zoneName
  };
}
