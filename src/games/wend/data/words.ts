/**
 * Hand-picked everyday words, grouped by length. A player has to *recognise*
 * what they are tracing, so this is deliberately a short list of familiar
 * words rather than a dictionary full of obscurities. Every entry is spelled
 * out in full — no truncation tricks, which silently produce non-words.
 */
export const WORDS: Record<number, string[]> = {
  4: [
    'BOAT', 'CARD', 'DESK', 'FIRE', 'GATE', 'HAND', 'IRON', 'KITE', 'LAMP',
    'MOON', 'NEST', 'OPEN', 'PATH', 'RAIN', 'SALT', 'TREE', 'VINE', 'WAVE',
    'YARD', 'BIRD', 'COIN', 'DOOR', 'FARM', 'GOLD', 'HILL', 'LAKE', 'MILK',
    'NOTE', 'PARK', 'ROAD', 'SNOW', 'WIND', 'BOOK', 'CAKE', 'LEAF',
  ],
  5: [
    'BEACH', 'CHAIR', 'DREAM', 'EAGLE', 'FLAME', 'GRASS', 'HOUSE', 'JUICE',
    'KNIFE', 'LIGHT', 'MUSIC', 'NURSE', 'OCEAN', 'PLANT', 'QUILT', 'RIVER',
    'STONE', 'TABLE', 'VOICE', 'WATER', 'BREAD', 'CLOUD', 'DANCE', 'FRUIT',
    'GLASS', 'HEART', 'MONEY', 'NIGHT', 'PAPER', 'ROBIN', 'SMILE', 'TIGER',
    'WHEAT', 'YOUTH', 'BRUSH',
  ],
  6: [
    'ANCHOR', 'BASKET', 'CANDLE', 'DESERT', 'ENGINE', 'FOREST', 'GARDEN',
    'HAMMER', 'ISLAND', 'JACKET', 'KETTLE', 'LADDER', 'MARKET', 'NAPKIN',
    'ORANGE', 'PENCIL', 'RABBIT', 'SILVER', 'TUNNEL', 'VALLEY', 'WINDOW',
    'BRIDGE', 'CAMERA', 'DINNER', 'FLOWER', 'GRAVEL', 'HARBOR', 'MIRROR',
    'ORCHID', 'PLANET', 'ROCKET', 'SUMMER', 'THREAD', 'WINTER', 'YELLOW',
  ],
  7: [
    'BALCONY', 'CABINET', 'DIAMOND', 'EVENING', 'FACTORY', 'GALLERY',
    'HARVEST', 'JOURNEY', 'KITCHEN', 'LANTERN', 'MACHINE', 'NETWORK',
    'OCTOPUS', 'PACKAGE', 'QUARTER', 'RAINBOW', 'SANDALS', 'THUNDER',
    'VILLAGE', 'WEATHER', 'BLANKET', 'CEILING', 'DOLPHIN', 'FEATHER',
    'GRANITE', 'HORIZON', 'LIBRARY', 'MORNING', 'PELICAN', 'SILENCE',
    'TEACHER', 'VITAMIN', 'WHISTLE', 'COMPASS', 'MUSTARD',
  ],
  8: [
    'AIRPLANE', 'BASEBALL', 'CHILDREN', 'DAUGHTER', 'ELEPHANT', 'FOOTBALL',
    'GRADUATE', 'HOSPITAL', 'INTERNET', 'LAVENDER', 'MOUNTAIN', 'NOTEBOOK',
    'PAINTING', 'QUANTITY', 'RESPONSE', 'SANDWICH', 'TRIANGLE', 'UNIVERSE',
    'VACATION', 'WORKSHOP', 'BIRTHDAY', 'CAMPFIRE', 'DINOSAUR', 'FESTIVAL',
    'GARDENER', 'KEYBOARD', 'MAGAZINE', 'PLATFORM', 'RAINDROP', 'TREASURE',
    'WATERWAY', 'SEASHELL', 'SNOWFALL', 'PASSPORT', 'DOORBELL',
  ],
  9: [
    'ADVENTURE', 'BUTTERFLY', 'CHOCOLATE', 'DIRECTION', 'EDUCATION',
    'FURNITURE', 'GENERATOR', 'HURRICANE', 'IMPORTANT', 'JELLYFISH',
    'KNOWLEDGE', 'LIGHTNING', 'MECHANICS', 'NEWSPAPER', 'ORCHESTRA',
    'PINEAPPLE', 'QUARTERLY', 'RASPBERRY', 'TELEPHONE', 'UNIVERSAL',
    'VEGETABLE', 'WATERFALL', 'ASTRONAUT', 'BLUEBERRY', 'CARPENTER',
    'DANDELION', 'FIREPLACE', 'GYMNASIUM', 'HAMBURGER', 'LANDSCAPE',
    'MOONLIGHT', 'SNOWSTORM', 'SATURDAYS', 'CROCODILE', 'SUBMARINE',
  ],
  10: [
    'ABSOLUTELY', 'BASKETBALL', 'CALCULATOR', 'DICTIONARY', 'EVERYTHING',
    'FOUNDATION', 'GENERATION', 'HELICOPTER', 'IMPOSSIBLE', 'JOURNALISM',
    'LABORATORY', 'MOTORCYCLE', 'NIGHTMARES', 'OCCUPATION', 'PHOTOGRAPH',
    'REFLECTION', 'STRAWBERRY', 'TELEVISION', 'UNDERSTAND', 'VOLLEYBALL',
    'WATERMELON', 'APPLESAUCE', 'BRAINSTORM', 'CHECKPOINT', 'DISCUSSION',
    'EXPERIMENT', 'FINGERTIPS', 'GRAPEFRUIT', 'INSTRUMENT', 'MICROSCOPE',
    'PEPPERMINT', 'SUNFLOWERS', 'TOOTHBRUSH', 'WILDERNESS', 'BUTTERMILK',
  ],
};

/** Words of a given length not already used on this board. */
export function wordsOfLength(length: number, exclude: string[] = []): string[] {
  return (WORDS[length] ?? []).filter((word) => !exclude.includes(word));
}
