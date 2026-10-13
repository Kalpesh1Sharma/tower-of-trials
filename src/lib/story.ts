/** UI-only Chronicle text. Floors and rewards are always server-owned. */
export const FLOOR_ENDINGS: readonly string[] = [
  'The first gate opens. Deep within the stone, something ancient hears your footsteps.',
  'A staircase unfolds from the dark. Dust stirs on steps no one has climbed in centuries.',
  'Three faded runes flare to life. They shine as though recognizing an old friend.',
  'A whisper crosses the hall: “Keep climbing. The tower has been waiting.”',
  'Six marks circle a sealed door. Beneath them is a name: the Keeper.',
  'Beyond the door, distant voices repeat a promise made long ago.',
  'A mural shows six guardians, each holding the symbol of a trial.',
  'A voice rises from the walls: “We built no prison here.”',
  "A hidden map appears, pointing toward a chamber beneath the tower's crown.",
  'The echoes become clear: “We were protecting the Heart, not hiding treasure.”',
  'The stairs lead into a chamber of turning gears and clocks with no hands.',
  'Each solved trial sends a pulse of light through the ancient machinery.',
  'You discover that every memory, number and pattern feeds the same sleeping engine.',
  'An inscription glows: “The key is not carried. It is earned, one choice at a time.”',
  'The last gear turns. Above you, a stairway unfolds into the clouds.',
  'The night sky surrounds the tower. Far below, the world looks small and peaceful.',
  'One of six celestial lamps ignites, answering the trials you have overcome.',
  'The Keeper’s voice returns: “We needed someone who would learn, not simply win.”',
  'A gentle heartbeat sounds behind the final walls. The Heart is waking.',
  'Six rays meet above a silent gate. A seventh light begins to form.',
  'The gate holds no lock. Its surface reflects every path you took to reach it.',
  'A message appears: “What survives is not perfection, but the courage to return.”',
  'The guardians fade into starlight. Their trials were a way of choosing a new Keeper.',
  'Only one step remains. The tower waits quietly for your decision.',
  'You awaken the Heart. Light fills the tower, and its doors open for the next traveler. Your story continues beyond the spire.',
] as const;

const BEYOND_SPIRE = "The tower's heart is awake. Beyond the final spire, new staircases continue to appear with every dawn.";

export function endingForFloor(floor:number):string {
  if (!Number.isInteger(floor) || floor<1) return 'The next mystery waits beyond the staircase.';
  return FLOOR_ENDINGS[floor-1] ?? BEYOND_SPIRE;
}
export function storyTitleForFloor(floor:number):string {
  if (floor>25) return 'Beyond the Spire';
  if (floor>15) return 'The Celestial Spire';
  if (floor>10) return 'The Clockwork Keep';
  if (floor>5) return 'The Hall of Echoes';
  return 'The Forgotten Gate';
}
