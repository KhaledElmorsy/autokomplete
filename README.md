# autokomplete

A fast, robust and highly scalable autocomplete module that matches query quickly regardless of the input size.

## Summary

**autokomplete** was created to capstone an [article][ac algos] on autocomplete algorithms using the findings and discussions in that article. It uses a suffix array built in linear time using [DC3][DC3] and two binary searches to find the match extents, slicing, mapping, and returning everything in between.

Matching time scales linearly with the number of matches and logarithmicly with the size of the input, making it especially fast for large inputs and longer queries.

## Use

Simply add **autokomplete** to your project with `npm install autokomplete` then:

1. ```js 
   import autocompleter from 'autokomplete'
   ```
2. Ensure your input is an array where each *entry* has a `string` property. The module will match queries against this property.
   ```js
   const entries = [
    {string: 'kha-ld', id: 4, name: 'Khaled'},  // You can add any other properties
    {string: 'test', id: 0},  // Entry schemas don't have to be identical
    {string: 'autocomplete'},  // Just make sure each has a "string" property
    {string: 'Pharaoh 🐪𓂀'}  // You can include any special characters or character case
   ]
   ```
3. Create an autocompleter instance with those entries:
   ```js
   const example = autocompleter(entries)
   ```
4. Match queries, returning an array of matching entries:
   ```js
   const matchOne = example.match('complete')
   // matchOne == [{string: 'autocomplete'}] - Matches substrings, not just prefixes

   const matchTwo = example.match('ph')
   // matchTwo == [{string: 'Pharaoh 🐪𓂀'}] - Matching is case insensitive

   const matchThree = example.match('test')
   // matchThree == [{string: 'test', id: 0}] - Matching returns the complete entry

   const matchFour = example.match('🐪')
   // matchFour == [{string: 'Pharaoh 🐪𓂀'}] - Yup
   ```

## Modifying a Model
`autocompleter`s are immutable, so adding new entries and removing existing ones will return new models.

### Insertion
Use `currentModel.insert(entries: entry|entry[])` to add new entries:
```js
const entries = [{string: 'Pyramid of Menkaure,', type: 'pyramid'}]
let egyptianWonders = autocompleter(entries)

const newEntry = {string: 'Pyramid of Khafre', type: 'pyramid'}
const egyptianWondersTemp = egyptianWonders.insert(newEntry) // Insert a single entry, and return a new model

const newerEntries = [
    {string: 'Great Pyramid of Khufu', type:'pyramid'},
    {string: 'Great Sphinx of Giza', type: 'statue'}
]
egyptianWonders = egyptianWondersTemp.insert(newerEntries) // Insert an array of entries
```
### Removal
Removing entries can be done in multilpe ways with: 
```js
currentModel.remove({
    filters: callback[], // An array of filtering functions. Keeping entries that return true/truthy
    strings: string[], // A string filter, removes entries with strings that match ones in this array
    entries: entry[] // Entry filter, removes entries that exactly match entries in this array.* 
})
```
<sub> * `entries` currently uses string comparisons and sorts upper level properties. Ensure depper properties are in the correct order or implement a filter function and use `filters`. </sub>

```js
const entries = [
    {string: 'test', id: 1},
    {string: 'module', id: 2},
    {string: 'autocomplete', id: 3},
    {string: 'kha-ld', id: 4}
]
const model = autocompleter(entries)

const idFilter = (entry) => entry.id > 1 // Only keep passing entries
const stringFilter = ['module'] // Remove entries with matching 'string' values
const entryFilter = [ {string: 'autocomplete', id: 3}] // Remove entries that exactly match ones in this list

const newModel = model.remove({
    filters: [idFilter], 
    strings: stringFilter,
    entries: entryFilter
}) // You don't need all 3 criterea
   // If you don't include any, you get an new but identical instance.

const matches = newModel.match('') // Match all entries
// matches == [{string: 'kha-ld', id: 4}]
```
## Contributing
This module has the potential to grow and improve even more.

Features like exporting model data JSON, mapping matches over multiple threads, choosing a different matching porperty instead of **"string"**, or adding more tests will all make the model more powerful and robust.

Feel free to contribute as you like.







[ac algos]:(https://dev.to/khald/autocomplete-algorithms-1pb2)
[DC3]:(https://www.cs.helsinki.fi/u/tpkarkka/publications/jacm05-revised.pdf)
