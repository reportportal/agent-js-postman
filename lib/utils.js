module.exports = {

    /**
     * Returns a match of specific string to a first given pattern. If there are no matches to given string - this function returns @type {null}.
     * Also this function provides to specify an index of regexp group to extract it from matched string. 
     * @param  {string} str String to check patterns.
     * @param  {RegExp[]} patterns An array of regexp patterns to verify given string.
     * @param  {Number} [index=0] An index of regexp group.
     * @returns {string} Regexp match.
     */
    matchPattern(str, patterns, index = 0) {
        if (!str) {
            return null;
        }

        const pattern = patterns.find(p => str.match(p))
        return pattern ? str.match(pattern)[index] : null;
    }
};