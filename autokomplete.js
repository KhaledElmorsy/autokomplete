import './typedef';

/**
 * Build and return an autocomplete model based on an array of entry objects.
 *
 * Each entry must have a **'string'** property.
 * @param {entry[]} entries - An array of entry objects.
 *
 * Entry objects get returned when autocompleting.
 *
 * Each must contain a **'string'** property.
 * @returns {autocompleter}
 */
function autocompleter(entries) {
  let { suffixArray, entryIndex } = build(entries);
  const entryCopy = JSON.parse(JSON.stringify(entries));
  /** @type {string} */
  return { match, insert, entries: entryCopy, remove };

  function build(entries) {
    const charCodeArray = mapCharacterCodes(entries);
    const suffixArray = getSuffixArray(charCodeArray);
    const entryIndex = getInputIndex(entries);

    return { suffixArray, entryIndex };

    function mapCharacterCodes(entries) {
      return entries
        .map(({ string }) =>
          [...string.toLowerCase()].map((char) => char.charCodeAt()).concat([0])
        )
        .flat();
    }

    function getSuffixArray(initialArray) {
      const array = initialArray.concat([0, 0]);

      const m0 = [];
      const m12 = [];
      for (let i = 0; i < array.length - 1; i++) {
        if (i % 3 === 0) {
          m0.push(i);
        } else {
          m12.push(i);
        }
      }

      let { rankedM12, sortedM12, m12Ranks, duplicatesFound } = radixSortM12(
        m12,
        array
      );

      if (duplicatesFound) {
        const m12SuffixArray = getSuffixArray(rankedM12);
        sortedM12 = m12SuffixArray.map((index) => m12[index]);
      }
      const sortedM0 = radixSortM0(m0, rankedM12, array);
      const suffixArray = merge(array, sortedM0, sortedM12, m12Ranks);
      return suffixArray;

      function radixSortM0(m0, rankedM12, inputArray) {
        let buckets = [];
        m0.forEach((index) => {
          const value = inputArray[index];
          if (!buckets[value]) {
            buckets[value] = [index];
          } else {
            buckets[value].push[index];
          }
        });
        let sortedM0 = [];
        buckets.forEach((bucket) => {
          if (bucket.length === 1) {
            sortedM0.push(bucket[0]);
          } else {
            let tempBucket = [];
            bucket.forEach((index) => {
              const m12Index = index + 1 - Math.floor(i / 2);
              const m12Rank = rankedM12[m12Index];
              tempBucket[m12Rank] = index;
            });
            tempBucket.forEach((index) => sortedM0.push(index));
          }
        });
        return sortedM0;
      }

      function radixSortM12(m12, inputArray) {
        let sortedIndices = m12.map((index, i) => ({ originalLoc: i, index }));
        let buckets;
        for (let i = 2; i >= 0; i--) {
          buckets = [];
          sortedIndices.forEach((Obj) => {
            const charCode = inputArray[Obj.index + i];
            if (!buckets[charCode]) {
              buckets[charCode] = [Obj];
            } else {
              buckets[charCode].push(Obj);
            }
          });
          sortedIndices = [];
          if (i === 0) break;
          buckets.forEach((bucket) => {
            bucket.forEach((Obj) => sortedIndices.push(Obj));
          });
        }

        const rankedM12 = [];
        const sortedM12 = [];
        const m12Ranks = {};
        let duplicatesFound = false;
        let currentRank = 1;
        buckets.forEach((bucket) => {
          for (let i = 0; i < bucket.length; i++) {
            const { originalLoc, index } = bucket[i];
            sortedM12.push(index);
            rankedM12[originalLoc] = currentRank;
            m12Ranks[m12[originalLoc]] = currentRank;
            let isDuplicate;
            if (i !== 0) {
              const prevIndex = bucket[i - 1].index;
              if (
                inputArray[prevIndex] === inputArray[index] &&
                inputArray[prevIndex + 1] === inputArray[index + 1] &&
                inputArray[prevIndex + 2] === inputArray[index + 2]
              ) {
                isDuplicate = true;
                duplicatesFound = true;
              }
            }
            if (!isDuplicate) currentRank++;
          }
        });
        return { duplicatesFound, rankedM12, sortedM12, m12Ranks };
      }

      function merge(input, sortedM0, sortedM12, indexRanks) {
        const sorted = [];
        while (sortedM0.length && sortedM12.length) {
          let m0 = sortedM0[0];
          let m12 = sortedM12[0];
          const pushM0 = compare(m0, m12);
          if (pushM0) {
            sorted.push(sortedM0.shift());
          } else {
            sorted.push(sortedM12.shift());
          }
        }
        return sorted.concat(sortedM0, sortedM12);

        function compare(m0, m12) {
          if (m0 % 3 !== 0 && m12 % 3 !== 0) {
            return indexRanks[m0] < indexRanks[m12];
          }
          if (input[m0] === input[m12]) {
            return compare(m0 + 1, m12 + 1);
          }
          return input[m0] < input[m12];
        }
      }
    }

    function getInputIndex(input) {
      let currIndex = 0;
      const indexedInput = {};
      for (let row of input) {
        indexedInput[currIndex] = row;
        currIndex += row.string.length + 1;
      }
      return indexedInput;
    }

    function getUniqueRanks(inputArray) {
      const ranks = {};
      let currentRank = 1;
      for (let value of inputArray) {
        if (ranks[value]) continue;
        ranks[value] = currentRank;
        currentRank++;
      }
      return ranks;
    }
  }

  /**
   * @global
   * @function remove
   * Remove entries from the model, returning a new model.
   *
   * Removal can be done through different methods.
   * @param {Object} Methods Object with the removal methods to apply
   * @param {String[]} Methods.strings An array of strings where any entry with a matching **string** property will be removed.
   * @param {entry[]} Methods.entries An array of entries where any matching entry will be removed.
   *
   * Property order matters in deeper object levels, and doesn't account for function properties.
   * @param {function[]} Methods.filters Filter functions to pass each entry though and remove ones that return **true**.
   * @returns
   */
  function remove({ strings, entries, filters }) {
    let sortedEntryStrings;
    if (entries) {
      sortedEntryStrings = entries.map((entry) =>
        JSON.stringify(sortProps(entry))
      );
    }

    let newEntries = Object.values(JSON.parse(JSON.stringify(entryIndex)));
    newEntries = newEntries.filter((entry) => {
      if (filters) {
        for (let filter of filters) {
          if (filter(entry)) return false;
        }
      }
      if (strings) {
        if (strings.includes(entry.string)) return false;
      }
      if (entries) {
        const sortedEntry = JSON.stringify(sortProps(entry));
        if (sortedEntryStrings.includes(sortedEntry)) return false;
      }
      return true;
    });
    return autocompleter(newEntries);

    function sortProps(entry) {
      return Object.fromEntries(
        Object.entries(entry).sort((a, b) => (a[0] < b[0] ? -1 : 1))
      );
    }
  }

  /**
   * Create a new autocompleter instance with current model's entries and an array of new entries.
   * @param {entry[]} entries
   * @returns
   */
  function insert(entries) {
    if (!entries instanceof Array) entries = [entries];
    let newEntries = Object.values(entryIndex).concat(entries);
    return autocompleter(newEntries);
  }

  /**
   * Autocomplete a query and return all matching entries in the model.
   * @param {String} query Input query to autocomplete
   * @returns {entry[]}
   */
  function match(query) {
    query = query.toLowerCase();
    const { rowPos, matchIndex } = binarySearch(query);
    if (matchIndex === -1) return [];
    let matches = [rowPos];
    matches = matches.concat(farmMatches(query, matchIndex));
    const uniqueMatches = [...new Set(matches)];
    return uniqueMatches.map((rowPos) => entryIndex[rowPos]);

    function binarySearch(query, start = 0, end = suffixArray.length - 1) {
      if (start > end) return { row: null, matchIndex: -1 };
      const midpoint = start + ((end - start) >> 1);
      const suffixPos = suffixArray[midpoint];
      const { suffix, rowPos } = getSuffixInfo(suffixPos);
      const suffixMatches = matchSuffix(query, suffix);
      if (suffixMatches) {
        return { rowPos, matchIndex: midpoint };
      } else {
        [start, end] =
          query < suffix ? [start, midpoint - 1] : [midpoint + 1, end];
        return binarySearch(query, start, end);
      }
    }

    function farmMatches(query, startIndex) {
      const matches = [];
      for (let i = startIndex + 1; i < suffixArray.length; i++) {
        const rowPos = matchRow(query, i);
        if (!rowPos) break;
        matches.push(rowPos);
      }
      for (let i = startIndex - 1; i >= 0; i--) {
        const rowPos = matchRow(query, i);
        if (!rowPos) break;
        matches.push(rowPos);
      }
      return matches;

      function matchRow(query, index) {
        const suffixPos = suffixArray[index];
        const { rowPos, suffix } = getSuffixInfo(suffixPos);
        if (matchSuffix(query, suffix)) {
          return rowPos;
        }
      }
    }

    function getSuffixInfo(suffixPos) {
      const { row, rowPos } = getRow(suffixPos);
      const string = row.string.toLowerCase(); // Lower Case Search
      const suffix = string.slice(suffixPos - rowPos);
      return { suffix, row, rowPos };

      function getRow(suffixPos) {
        let rowPos = suffixPos;
        let row;
        while (!(row = entryIndex[rowPos])) {
          rowPos--;
        }
        return { rowPos, row };
      }
    }

    function matchSuffix(query, suffix) {
      const lcp = getLCP(query, suffix);
      return lcp === query;

      function getLCP(...strings) {
        let lcp = strings[0] || '';
        for (let string of strings.slice(1)) {
          for (let [i, char] of [...lcp].entries()) {
            if (char !== string[i]) {
              lcp = lcp.slice(0, i);
              break;
            }
          }
          if (!lcp) break;
        }
        return lcp;
      }
    }
  }
}

export default autocompleter;
