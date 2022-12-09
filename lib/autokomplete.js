import '../typedef';

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
  let { suffixArray, entryIndex, suffixArrayEntries, charArray } = build(entries);

  return { match, insert, remove };

  function build(entries) {
    const charArray = getCharacterArray(entries);
    const charCodeArray = charArray.map(char => char.charCodeAt());
    const suffixArray = getSuffixArray(charCodeArray);
    const entryIndex = getInputIndex(entries);
    const mappedChars = mapCharacterArray(charArray, entryIndex);
    const suffixArrayEntries = suffixArray.map(pos => mappedChars[pos].e)

    return { suffixArray, entryIndex, suffixArrayEntries, charArray };

    function mapCharacterArray(charArray, entryIndex) {
      let currentEntryIndex;
      return charArray.map((char,i) => {
        if (entryIndex[i]) currentEntryIndex = i;
        return {c: char, e: currentEntryIndex} // {Character: char, Entry: i}
      })
    }

    function getCharacterArray(entries) {
      return entries
        .map(({ string }) =>
          [...string]
            .map((char) => char.toLowerCase()[0]) // Special characters lengths grow when converted to lower case to store identifying symbols
            .concat(['\x00']) // Add a character that'll map to zero after each string
        )
        .flat();
    }

    function getSuffixArray(initialArray) {
      const inputLength = initialArray.length;
      const m0 = [];
      const m1 = [];
      const m2 = []
      for (let i = 0; i < inputLength; i++) {
        const k = i%3
        if (k === 0) {
          m0.push(i);
          if (i === inputLength) m1.push(i+1)
        } else if (k === 1){
          m1.push(i);
        } else {
          m2.push(i)
        }
      }
      const m12 = m1.concat(m2)
      initialArray = initialArray.concat([0, 0, 0]);

      let { rankedM12, sortedM12, m12Ranks, duplicatesFound } = radixSortM12(
        m12,
        initialArray
        );
      if (duplicatesFound) {
        rankedM12 = getSuffixArray(rankedM12);
        sortedM12 = rankedM12.map((index) => m12[index]);
        m12Ranks = {};
        sortedM12.forEach((index, i) => (m12Ranks[index] = i));
      }

      const sortedM0 = radixSortM0(m0, m12Ranks, initialArray);

      const suffixArray = merge(initialArray, sortedM0, sortedM12, m12Ranks);
      return suffixArray;

      function radixSortM0(m0, m12Ranks, inputArray) {
        let buckets = [];
        m0.forEach((index) => {
          const rank = m12Ranks[index + 1] || 0;
          buckets[rank] ||= []
          buckets[rank].push(index);
        });
        let current = buckets;
        buckets = [];
        current = current.flat(1)
        current.forEach((index) => {
          const value = inputArray[index];
          buckets[value] ||= [];
          buckets[value].push(index);
        });
        let sortedM0 = [];
        buckets.forEach((bucket) =>
          bucket.forEach((index) => sortedM0.push(index))
        );
        return sortedM0;
      }

      function radixSortM12(m12, inputArray) {
        let buckets = [];
        m12.forEach((index, i) => {
          const value = inputArray[index + 2] || 0;
          buckets[value] ||= [];
          buckets[value].push({ pos: i, index });
        });
        for (let i = 1; i >= 0; i--) {
          let tempBuckets = [];
          buckets.forEach((bucket) =>
            bucket.forEach((Obj) => {
              const value = inputArray[Obj.index + i] || 0;
              tempBuckets[value] ||= [];
              tempBuckets[value].push(Obj);
            })
          );
          buckets = tempBuckets;
        }
        const rankedM12 = [];
        const sortedM12 = [];
        const m12Ranks = {};
        let duplicatesFound = false;
        let currentRank = 0;
        buckets.forEach((bucket) =>
          bucket.forEach((Obj, i) => {
            const { pos, index } = Obj;
            let hasDuplicate = false;
            if (i !== 0) {
              const prevIndex = bucket[i - 1].index;
              if (
                inputArray[prevIndex] === inputArray[index] &&
                inputArray[prevIndex + 1] === inputArray[index + 1] &&
                inputArray[prevIndex + 2] === inputArray[index + 2]
              ) {
                duplicatesFound = true;
                hasDuplicate = true;
              }
            }
            if (!hasDuplicate) currentRank++;
            sortedM12.push(index);
            rankedM12[pos] = currentRank;
            m12Ranks[index] = currentRank;
          })
        );
        return { duplicatesFound, rankedM12, sortedM12, m12Ranks };
      }

      function merge(input, sortedM0, sortedM12, indexRanks) {
        const sorted = [];
        const m0Length = sortedM0.length;
        const m12Length = sortedM12.length;
        let m0Index = 0;
        let m12Index = 0;
        while (m0Index < m0Length && m12Index < m12Length) {
          let m0 = sortedM0[m0Index];
          let m12 = sortedM12[m12Index];
          const pushM0 = compare(m0, m12);
          if (pushM0) {
            sorted.push(sortedM0[m0Index]);
            m0Index++;
          } else {
            sorted.push(sortedM12[m12Index]);
            m12Index++;
          }
        }
        return sorted.concat(
          sortedM0.slice(m0Index),
          sortedM12.slice(m12Index)
        );

        function compare(m0, m12) {
          if (m0 % 3 !== 0 && m12 % 3 !== 0) {
            return (indexRanks[m0] || 0) < (indexRanks[m12] || 0);
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
        currIndex += [...row.string].length + 1; // Emoji's length = 2
      }
      return indexedInput;
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
    const firstMatch = binarySearch(query);
    const lastMatch = binarySearch(query, {lastMatch: true});
    return getEntries(firstMatch, lastMatch)

    function binarySearch(query, {start = 0, end = suffixArray.length - 1,lastMatch = false} = {}) {
      if (start > end) return -1;
      const midpoint = start + ((end - start) >> 1);
      const suffixPos = suffixArray[midpoint];
      const {lcp, nextChar, isMatched} = getLCP(query, suffixPos, true)
      if (isMatched) {
        const neighborShift = lastMatch? 1 : -1
        const neighborIndex = midpoint + neighborShift;
        if (neighborIndex > suffixArray.length - 1 || neighborIndex < 0) {
          return midpoint
        }
        const neighborPos = suffixArray[neighborIndex];
        const neighborMatch = getLCP(query, neighborPos);
        if (!neighborMatch.isMatched) return midpoint;
        [start, end] = lastMatch? [midpoint + 1, end] : [start, midpoint - 1]
        return binarySearch(query, {start, end, lastMatch})
      } else {
        [start, end] =
          query < lcp + nextChar ? [start, midpoint - 1] : [midpoint + 1, end];
        return binarySearch(query, {start, end, lastMatch});
      }
    }
    
    function getLCP(query, suffixPos, getNext = false) {
      let lcp = '';
      let isMatched = true;
      let nextChar;
      for (let i = 0; i < query.length; i++) {
        const suffixChar = charArray[suffixPos + i]
        if (query[i] !== suffixChar) {
          isMatched = false;
          if (getNext) nextChar = suffixChar
          break;
        }
        lcp = lcp.concat(suffixChar);
      }
      return {lcp, isMatched, nextChar}
     }

     function getEntries(start, end) {
      const matchedIDs = new Set()
      const entries = [];
      suffixArrayEntries.slice(start, end +1).forEach((entryID) => {
        if (matchedIDs.has(entryID)) return;
        matchedIDs.add(entryID)
        entries.push(entryIndex[entryID])
      })
      return entries
     }
    }
  }

export default autocompleter;
