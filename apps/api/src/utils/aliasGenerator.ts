const ADJECTIVES = [
  'Silent', 'Wandering', 'Amber', 'Neon', 'Distant', 'Hollow',
  'Copper', 'Velvet', 'Frozen', 'Blazing', 'Crimson', 'Silver',
  'Ashen', 'Vivid', 'Drifting', 'Phantom', 'Feral', 'Obsidian',
  'Lunar', 'Solar',
];

const ANIMALS = [
  'Mongoose', 'Starling', 'Otter', 'Kestrel', 'Lynx', 'Heron',
  'Marten', 'Ibis', 'Jackal', 'Raven', 'Coyote', 'Finch',
  'Osprey', 'Badger', 'Falcon', 'Mink', 'Weasel', 'Bittern',
  'Caracal', 'Tapir',
];

export function generateAlias(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}
