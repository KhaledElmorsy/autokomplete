/**
 * @typedef {Object} entry Main objects being matched and returned.
 *
 * Must contain a **string** property.
 *
 * Can have any other properties to include with a specific entry.
 *
 * Properties don't have to be uniform along input objects.
 *
 * @property {String} string String that gets matched when autocompleting.
 *
 * Matching is case *insensitive* so character case doesn't matter.
 *
 * Maintain desired/original character cases to act as both autocomplete and data retrieval.
 */
