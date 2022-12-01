function autocomplete(input) {
  let { suffixArray, inputIndex } = build(input);
  return { match, insert, inputIndex, remove };

  function build(input) {
    preprocess(input);
    const initialArray = getInitialArray(input);
    const suffixArray = getSuffixArray(initialArray);
    const inputIndex = getInputIndex(input);

    return { suffixArray, inputIndex };

    function preprocess(input) {
      for (let row of [...input]) {
        if (!row.string)
          throw new Error('Each item should have a "string" property');
      }
    }

    function getInitialArray(input) {
      const charSet = getCharSet(input);
      const charMap = getRankedCharMap(charSet);
      return input
        .map(
          ({ string }) =>
            [...string.toLowerCase()].map((char) => charMap[char]).concat([0]) //  Lower Case Search
        )
        .flat();

      function getCharSet(input) {
        const allChars = input
          .map(({ string }) => string.toLowerCase().split('')) // Lower Case Search
          .flat();
        return [...new Set(allChars)];
      }

      function getRankedCharMap(charSet) {
        const sparseUTF16Array = charSet.reduce((acc, char) => {
          acc[char.charCodeAt()] = char;
          return acc;
        }, []);
        const sortedChars = Object.values(sparseUTF16Array);
        return getUniqueRanks(sortedChars);
      }
    }

    function getSuffixArray(initialArray) {
      const array = initialArray.concat([0, 0]);

      const [m0, m1, m2] = [0, 1, 2].map((shift) =>
        Array.from({ length: array.length / 3 }, (_, i) => 3 * i + shift)
      );

      let m12 = m1.concat(m2);
      m12 = m12.filter((i) => i + 2 < array.length);
      const m12Blocks = m12.map((i) => [i, i + 1, i + 2].map((j) => array[j]));
      const m12BlockMap = mapSequential(m12Blocks, m12);
      const sortedM12Blocks = radixSort(m12Blocks, 3);
      let sortedM12 = sortedM12Blocks.map((block) => m12BlockMap[block]);

      const blockRanks = getUniqueRanks(sortedM12Blocks);
      if (Object.values(blockRanks).length !== m12.length) {
        const rankedM12 = m12Blocks.map((block) => blockRanks[block]);
        const m12SuffixArray = getSuffixArray(rankedM12);
        sortedM12 = m12SuffixArray.map((i) => m12[i]);
      }

      const indexRanks = Object.fromEntries(
        sortedM12.map((index, i) => [index, i])
      );

      const m0Pairs = m0.map((index) => [array[index], indexRanks[index + 1]]);
      const m0PairMap = mapSequential(m0Pairs, m0);
      const sortedM0Pairs = radixSort(m0Pairs, 2);
      const sortedM0 = sortedM0Pairs.map((pair) => m0PairMap[pair]);

      const suffixArray = merge(array, sortedM0, sortedM12, indexRanks);
      return suffixArray;

      function radixSort(inputArray, size) {
        let sortedArray = inputArray;
        let buckets;
        for (let i = size - 1; i >= 0; i--) {
          buckets = [];
          sortedArray.forEach((block) => {
            buckets[block[i]] ||= [];
            buckets[block[i]].push(block);
          });
          sortedArray = [];
          buckets.forEach((bucket) =>
            bucket.forEach((block) => sortedArray.push(block))
          );
        }
        return sortedArray;
      }

      function mapSequential(keys, values) {
        return keys.reduce(
          (acc, key, i) => ({ ...acc, ...{ [key]: values[i] } }),
          {}
        );
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
      ranks = {};
      currentRank = 1;
      for (let value of inputArray) {
        if (ranks[value]) continue;
        ranks[value] = currentRank;
        currentRank++;
      }
      return ranks;
    }
  }

  function remove({ string, values, filter }) {
    if (!values && !string && !filter) return;
    let newInput = Object.values(JSON.parse(JSON.stringify(inputIndex)));
    if (filter) {
      newInput = newInput.filter(filter);
    } else if (string) {
      newInput = newInput.filter((row) => row.string !== string);
    } else {
      sortedValueStrings = values.map(val => JSON.stringify(sortProps(val)))
      newInput = newInput.filter((row) => {
        const sortedRow =sortProps(row);
        return !sortedValueStrings.includes(JSON.stringify(sortedRow))
      });
    }
    return autocomplete(newInput);

    function sortProps(obj) {
      return Object.fromEntries(
        Object.entries(obj).sort((a, b) => (a[0] < b[0] ? -1 : 1))
      );
    }
  }

  function insert(input) {
    if (!input instanceof Array) input = [input];
    let newInput = Object.values(inputIndex).concat(input);
    return autocomplete(newInput);
  }

  function match(query) {
    query = query.toLowerCase();
    const { rowPos, matchIndex } = binarySearch(query);
    if (matchIndex === -1) return [];
    let matches = [rowPos];
    matches = matches.concat(farmMatches(query, matchIndex));
    const uniqueMatches = [...new Set(matches)];
    return uniqueMatches.map(rowPos => entryIndex[rowPos])

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

export default autocomplete
