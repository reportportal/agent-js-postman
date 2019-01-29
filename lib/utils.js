'use strict';

const _ = require('lodash');

module.exports = {

    /**
     * Returns a match of specific string to a first given pattern. If there are no matches to given string -
     * this function returns @type {null}.
     * Also this function provides to specify an index of regexp group to extract it from matched string.
     *
     * @param  {string} str String to check patterns.
     * @param  {RegExp[]} patterns An array of regexp patterns to verify given string.
     * @param  {Number} [index=0] An index of regexp group.
     * @returns {string} Regexp matching.
     */
    matchPattern(str, patterns, index = 0) {
        if (!str) {
            return null;
        }

        const pattern = patterns.find(p => str.match(p));
        return pattern ? str.match(pattern)[index] : null;
    }
};

/**
 * Returns a section of an array which starts from specific index and ends with an index of the element which satisfies
 * a given condition.
 *
 * @param {Number} start The beginning of the specified portion of the array.
 * @param {Function} [condition=_.identity] The condition invoked per iteration and checks every element.
 *      If an element satisfies this condition - it's index will be the end of a portion of the array.
 * @returns {Array} Returns the reduced array.
 */
Array.prototype.sliceOn = function (start, condition = _.identity) {
    let lastIndex;

    for (let index = start; index < this.length; index++) {
        if (condition(this[index])) {
            lastIndex = index;
            break;
        }
    }
    return this.slice(start, lastIndex);
};


/**
 * Creates a flattened array of values by running each element in given array
 * thru `iteratee` and flattening the mapped results. The iteratee is invoked
 * with three arguments: (value, index|key, collection).
 *
 * @param  {Function} [iteratee=_.identity] The function invoked per iteration.
 * @returns {Array} Returns the new flattened array.
 */
Array.prototype.flatMap = function (iteratee = _.identity) {
    return this.map(iteratee).reduce((acc, x) => acc.concat(x), []);
};
