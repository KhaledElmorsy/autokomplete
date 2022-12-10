import autocompleter from '../lib';
import testSet from './large-entry-set.json'; // https://zenodo.org/record/3237552#collapseTwo

function sortEntries(entries) {
  return entries.sort((a, b) => (a.string < b.string ? -1 : 1));
}

describe('match()', () => {
  let entries;
  let query;
  let expected;

  /**
   * Bind a callback to invoke after the default assertion.
   * Passes the original matches, and the model as an object.
   *
   * Use to run extra tests on the same model, or extra assertions on
   * the original matches.
   */
  let postAssertion;

  afterEach(() => {
    const model = autocompleter(entries);
    const matches = model.match(query);
    expect(sortEntries(matches)).toEqual(sortEntries(expected));
    if (postAssertion) postAssertion({ matches, model });
  });

  it('handles ascii characters', () => {
    entries = [{ string: 'test' }, { string: 'complete' }];
    query = 'es';
    expected = [{ string: 'test' }];
  });

  it('returns multiple valid matches', () => {
    entries = [
      { string: 'test' },
      { string: 'complete' },
      { string: 'suffix' },
    ];
    query = 'e';
    expected = [{ string: 'complete' }, { string: 'test' }];
  });

  it('is case insensitive, but doesnt change original strings', () => {
    entries = [{ string: 'teST' }];
    query = 'est';
    expected = entries;
    postAssertion = ({ matches }) => {
      expect(matches).not.toEqual({ string: 'test' });
    };
  });

  it('handles emoji', () => {
    entries = [{ string: 'test' }, { string: 'pizza🍕' }];
    query = '🍕';
    expected = [{ string: 'pizza🍕' }];
  });

  it('handles special characters', () => {
    entries = [{ string: 'über' }, { string: 'Ültra' }];
    query = 'ü';
    expected = [{ string: 'Ültra' }, { string: 'über' }];
  });

  it('handles several long strings and multi-word queries', () => {
    const input = testSet.slice(3000); // To speed up building
    entries = input;
    query = 'google is';
    expected = input.filter((row) => row.string.match(/google is/i)); // Ground truth
  });
});

describe('insert()', () => {
  let model;
  beforeEach(() => {
    const entries = [
      { string: 'test' },
      { string: 'auto' },
      { string: 'complete' },
      { string: 'data' },
    ];
    model = autocompleter(entries);
  });

  it('returns a new autocompleter instance', () => {
    const newModel = model.insert([{ string: 'test2' }]);
    expect(newModel).not.toBe(model);
    expect(newModel.insert).not.toBe(undefined);
  });

  describe('- Hybrid unit/integration tests- Fail if Match() breaks', () => {
    it('adds single entries to the original models list', () => {
      const newModel = model.insert([{ string: 'test2' }]);
      const matches = newModel.match('2');
      expect(matches).toEqual([{ string: 'test2' }]);
    });

    it('adds multiple entries to the original list', () => {
      const newEntries = [{ string: 'moreEntries' }, { string: 'moreMatches' }];
      const newModel = model.insert(newEntries);
      const matches = newModel.match('more');
      expect(sortEntries(matches)).toEqual(sortEntries(newEntries));
    });
  });
});

describe('remove()', () => {
  let model;
  beforeEach(() => {
    const entries = [
      { string: 'test', id: 2 },
      { string: 'auto', id: 5 },
      { string: 'module', id: 1 },
    ];
    model = autocompleter(entries);
  });

  it('returns a new autocompleter instance', () => {
    const newModel = model.remove();
    expect(newModel).not.toBe(model);
    expect(newModel.remove).not.toBe(undefined);
  });

  describe('- Hybrid unit/integration tests- Fail if Match() breaks', () => {
    it('keeps entries based on an array of filter functions', () => {
      const idFilter = (entry) => entry.id < 5;
      const stringFilter = (entry) => !entry.string.startsWith('te');

      const newModel = model.remove({ filters: [idFilter, stringFilter] });
      const matches = newModel.match('');

      expect(matches).toEqual([{ string: 'module', id: 1 }]);
    });

    it('removes entries based on if their string value matches a filter list', () => {
      const stringsToRemove = ['module', 'auto'];

      const newModel = model.remove({ strings: stringsToRemove });
      const matches = newModel.match('');

      expect(matches).toEqual([{ string: 'test', id: 2 }]);
    });

    it('removes entries if they exactly match ones in a filter list', () => {
      const entriesToRemove = [
        { string: 'test', id: 2 },
        { string: 'auto', id: 5 },
        { string: 'module', id: 8 }, // Shouldn't remove {string:'module', id: 1}
      ];

      const newModel = model.remove({ entries: entriesToRemove });
      const matches = newModel.match('');

      expect(matches).toEqual([{ string: 'module', id: 1 }]);
    });

    it('can handle multiple criterea at once', () => {
      const entries = [{ string: 'test', id: 2 }];
      const strings = ['auto'];
      const filters = [(entry) => entry.id > 2];

      const newModel = model.remove({ entries, strings, filters });
      const matches = newModel.match('');

      expect(matches).toEqual([]);
    });
  });
});
