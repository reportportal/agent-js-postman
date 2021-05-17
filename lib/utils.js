/*
 *  Copyright 2020 EPAM Systems
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

'use strict';

const _ = require('lodash');
const path = require('path');
const pjson = require('./../package.json');

const PJSON_VERSION = pjson.version;
const PJSON_NAME = pjson.name;

/**
 * The default name of test launch. Agent will use this name if options.launch is not specified.
 *
 * @type {String}
 */
const DEFAULT_LAUNCH_NAME = 'Newman launch';

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
    matchPattern (str, patterns, index = 0) {
        if (!str) {
            return null;
        }

        if (!this.isArrayOfType(patterns, RegExp)) {
            throw Error('Patterns array must contain only RegExp patterns');
        }

        const pattern = _.find(patterns, p => str.match(p));

        return pattern ? str.match(pattern)[index] : null;
    },

    /**
     * Verifies whether the given array consists of elements only of specific type.
     *
     * @param  {Array} array Array to check.
     * @param  {Function} type Constructor of specific type to verify.
     * @returns {boolean} Is a given array consists of only of given types.
     */
    isArrayOfType (array, type) {
        return _.isArray(array) && array.every(x => x instanceof type);
    },

    getStepParameterByPatterns (script, patterns) {
        return script
            .split(';')
            .sliceOn(0, x => x.includes('//')) // Removes commented elements
            .map(x => this.matchPattern(x, patterns, 1))
            .filter(Boolean); // Removes empty step names
    },

    getArrAttributesFromString (stringAttr) {
        return stringAttr ? stringAttr.split(';').map(attribute => {
            const attributeArr = attribute.split(':');

            return {
                key: attributeArr.length === 1 ? null : attributeArr[0],
                value: attributeArr.length === 1 ? attributeArr[0] : attributeArr[1]
            };
        }) : [];
    },

    /**
     * Extract all attributes from the given array and transform its
     *
     * @param  {Object} variables Object that contains array of postman's variables.
     * @returns {Array} Array of attributes.
     */
    getAttributes (variables) {
        const attributes = _.find(variables.members, {
            key: 'rp.attributes'
        });

        return attributes ? this.getArrAttributesFromString(attributes.value) : [];
    },

    getCollectionVariablesByKey (key, variables) {
        const result = _.find(variables.members, { key: `rp.${key}` });

        return result && result.value;
    },

    getClientInitObject (options = {}) {
        return {
            token: options.token || options.reportportalAgentJsPostmanToken,
            endpoint: options.endpoint || options.reportportalAgentJsPostmanEndpoint,
            launch: options.launch || options.reportportalAgentJsPostmanLaunch || DEFAULT_LAUNCH_NAME,
            project: options.project || options.reportportalAgentJsPostmanProject,
            rerun: options.rerun || options.reportportalAgentJsPostmanRerun,
            rerunOf: options.rerunOf || options.reportportalAgentJsPostmanRerunOf,
            description: options.description || options.reportportalAgentJsPostmanDescription,
            attributes: options.attributes ||
                this.getArrAttributesFromString(options.reportportalAgentJsPostmanAttributes),
            debug: options.debug || options.reportportalAgentJsPostmanDebug,
            mode: options.mode || options.reportportalAgentJsPostmanMode
        };
    },

    getStartLaunchObj (options = {}) {
        const systemAttr = {
            key: 'agent',
            value: `${PJSON_NAME}|${PJSON_VERSION}`,
            system: true
        };
        const attributes = options.attributes ||
            this.getArrAttributesFromString(options.reportportalAgentJsPostmanAttributes);

        return {
            launch: options.launch || options.reportportalAgentJsPostmanLaunch || DEFAULT_LAUNCH_NAME,
            description: options.description || options.reportportalAgentJsPostmanDescription,
            attributes: attributes ? attributes.concat(systemAttr) : [systemAttr],
            rerun: options.rerun || options.reportportalAgentJsPostmanRerun,
            rerunOf: options.rerunOf || options.reportportalAgentJsPostmanRerunOf,
            mode: options.mode || options.reportportalAgentJsPostmanMode
        };
    },

    getCollectionPath (workingDir) {
        const testFileDir = path
            .parse(path.normalize(path.relative(process.cwd(), workingDir)))
            .dir.replace(new RegExp('\\'.concat(path.sep), 'g'), '/');
        const separator = testFileDir ? '/' : '';
        const testFile = path.parse(workingDir);

        return `${testFileDir}${separator}${testFile.base}`;
    },

    getCodeRef (collectionPath, title) {
        return `${collectionPath}/${title}`;
    },

    getAgentInfo () {
        return {
            version: PJSON_VERSION,
            name: PJSON_NAME
        };
    },

    getParameters (data, index) {
        if (!data) {
            return undefined;
        }
        const parameters = data[index] || data[data.length - 1];

        return Object.entries(parameters).map(parameter => ({
            key: parameter[0],
            value: parameter[1]
        }));
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

Array.prototype.groupBySpecificField = function (specificField, additionalFields) {
    return this.reduce((acc, current) => {
        if (current && current[specificField]) {
            return acc.concat([current]);
        }

        additionalFields && additionalFields.forEach(additionalField => {
            if (acc.length && current && current[additionalField]) {
                acc[acc.length - 1] = Object.assign(acc[acc.length - 1], current);
            }
        });

        return acc;
    }, []);
};
