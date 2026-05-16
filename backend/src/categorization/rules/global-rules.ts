// Curated global category rules.
// Evaluated top-to-bottom; first match wins.
//
// Each rule is a pure function of (merchant, description, mcc) → boolean.
// Adding ML categorisation later means inserting a model-backed rule above
// or below this list - the engine doesn't change.

export interface CategoryRule {
  category: string;
  match: (input: { merchant: string; description: string; mcc: string | null }) => boolean;
}

const re = (pattern: RegExp): CategoryRule['match'] => ({ merchant, description }) =>
  pattern.test(merchant) || pattern.test(description);

const mccIn = (codes: string[]): CategoryRule['match'] => ({ mcc }) =>
  mcc !== null && codes.includes(mcc);

export const GLOBAL_RULES: CategoryRule[] = [
  // Income - always evaluate first so we don't miscategorise as "transfer"
  { category: 'income', match: re(/payroll|salary|wages|employer\s+ltd/i) },
  { category: 'income', match: re(/HMRC|tax\s+refund|dividend/i) },

  // Housing
  { category: 'housing', match: re(/rent|landlord|mortgage|estate\s+agent/i) },
  { category: 'housing', match: re(/council\s+tax/i) },

  // Bills & utilities
  { category: 'bills', match: re(/british\s*gas|octopus\s*energy|edf\s*energy|eon\s*next|bulb/i) },
  { category: 'bills', match: re(/thames\s*water|severn\s*trent|anglian\s*water/i) },
  { category: 'bills', match: re(/vodafone|o2|three\s*uk|ee\s*ltd|sky\s*broadband|virgin\s*media|bt\s*group/i) },
  { category: 'bills', match: mccIn(['4814', '4900', '4899']) },

  // Subscriptions (recurring entertainment)
  { category: 'subscriptions', match: re(/netflix|spotify|apple\.com\/bill|disney\+|prime\s*video|youtube\s*premium|nytimes/i) },

  // Groceries
  { category: 'groceries', match: re(/tesco|sainsbury|asda|morrisons|waitrose|lidl|aldi|m&s\s*food|marks\s*&?\s*spencer\s*food|co-?op/i) },
  { category: 'groceries', match: mccIn(['5411', '5499']) },

  // Eating out
  { category: 'eating_out', match: re(/pret|costa|starbucks|caffe\s*nero|greggs|leon\s*restaurant|wagamama|nandos|deliveroo|just\s*eat|uber\s*eats/i) },
  { category: 'eating_out', match: mccIn(['5812', '5813', '5814']) },

  // Transport
  { category: 'transport', match: re(/tfl|transport\s*for\s*london|trainline|national\s*rail|uber\s*\*|bolt\.eu|free?now/i) },
  { category: 'transport', match: re(/shell|bp\s*service|esso|texaco|sainsbury.*fuel/i) },
  { category: 'transport', match: mccIn(['4111', '4112', '4121', '4131', '5541', '5542', '7523']) },

  // Health
  { category: 'health', match: re(/boots|superdrug|nhs|pharmacy|dentist|optician|specsavers|puregym|the\s*gym|virgin\s*active/i) },
  { category: 'health', match: mccIn(['5912', '8011', '8021', '8042', '7997']) },

  // Shopping (general retail) - keep AFTER groceries/eating out so it's a fallback
  { category: 'shopping', match: re(/amazon|asos|argos|john\s*lewis|next\s*retail|h&m|zara|ikea|currys/i) },
  { category: 'shopping', match: mccIn(['5311', '5651', '5942', '5945']) },

  // Travel
  { category: 'travel', match: re(/british\s*airways|easyjet|ryanair|jet2|booking\.com|airbnb|expedia|hotels\.com/i) },
  { category: 'travel', match: mccIn(['3000', '3001', '3002', '3003', '4511', '7011']) },

  // Transfers between accounts
  { category: 'transfer', match: re(/transfer\s+(to|from)|standing\s+order|own\s+account/i) },

  // Cash
  { category: 'cash', match: re(/atm|cash\s+withdrawal|link\s+atm/i) },
];
