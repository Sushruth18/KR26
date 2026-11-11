/**
 * Terms that must not appear anywhere on the site (visible text, alt/aria text, data files, built output):
 * the college dropped these from the Day 2 programme. Shared by validate-data (source data) and
 * check-banned-terms (the built dist/).
 */
export const BANNED: RegExp[] = [
  /motor[\s-]*heads?/i,
  /movie[\s-]*promotion/i,
  /\bDAP\b/, // case-sensitive: the acronym, not "dap" inside a word or an identifier
  /ಮೋಟಾರ್\s*ಹೆಡ್/, // "Motor Heads"
  /ಚಲನಚಿತ್ರ\s*ಪ್ರಚಾರ/, // "Movie Promotion"
  /ಡಿ\.?\s?ಎ\.?\s?ಪಿ/, // "DAP" in Kannada letters
];
