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

const utils = require('./../lib/utils');

describe('utils', () => {
    describe('matchPattern', () => {
        test('should return null if the string is undefined', () => {
            const matchPattern = utils.matchPattern();

            expect(matchPattern).toEqual(null);
        });

        test('should throw Error if patterns array doesn\'t contain regex patterns', () => {
            const errorMessage = 'Patterns array must contain only RegExp patterns';

            expect(() => utils.matchPattern('str', 'patterns')).toThrowError(errorMessage);
        });

        test('should return correct match pattern if there is a match when matching the string with the regex', () => {
            const patterns = [/[\s]*pm.test\("(.*?)",/];
            const string = 'pm.test("Test, status code is 200", function () {});';

            const matchPattern = utils.matchPattern(string, patterns);

            expect(matchPattern).toEqual('pm.test("Test, status code is 200",');
        });

        test('should return null match pattern if there is no a match when matching the string with the regex', () => {
            const patterns = [/[\s]*pm.random\("(.*?)",/];
            const string = 'pm.test("Test, status code is 200", function () {});';

            const matchPattern = utils.matchPattern(string, patterns);

            expect(matchPattern).toEqual(null);
        });
    });

    describe('isArrayOfType', () => {
        test('should return true if an array consists of elements of specific type', () => {
            const isArrayOfType = utils.isArrayOfType([/[\s]*pm.random\("(.*?)",/], RegExp);

            expect(isArrayOfType).toEqual(true);
        });

        test('should return false if an array doesn\'t consist of elements of specific type', () => {
            const isArrayOfType = utils.isArrayOfType(['string'], RegExp);

            expect(isArrayOfType).toEqual(false);
        });
    });

    describe('getStepNames', () => {
        test('should return correct array of stepNames', () => {
            const stepNames = utils.getStepNames('pm.test("Test, status code is 400", function () {');

            expect(stepNames).toEqual(['Test, status code is 400']);
        });
    });

    describe('getAttributes', () => {
        test('should return correct array of attributes', () => {
            const variables = {
                members: [
                    {
                        id: 'id',
                        key: 'keyOne',
                        value: 'valueOne',
                        type: 'string'
                    },
                    {
                        id: 'idTwo',
                        key: 'keyTwo',
                        value: 'valueTwo',
                        type: 'string'
                    }
                ]
            };
            const expectedAttributes = [
                {
                    key: 'keyOne',
                    value: 'valueOne'
                },
                {
                    key: 'keyTwo',
                    value: 'valueTwo'
                }
            ];

            const attributes = utils.getAttributes(variables);

            expect(attributes).toEqual(expectedAttributes);
        });
    });

    describe('Array.prototype.sliceOn', () => {
        test('should return an array from 0 index to 2 index', () => {
            const array = ['one', 'two', '//three'];

            const result = array.sliceOn(0, x => x.includes('//'));

            expect(result).toEqual(['one', 'two']);
        });

        test('should return an array from 0 index to 1 index', () => {
            const array = ['one', '//two', 'three'];

            const result = array.sliceOn(0, x => x.includes('//'));

            expect(result).toEqual(['one']);
        });

        test('should return an empty array if the condition doesn\'t set', () => {
            const array = ['one', '//two', 'three'];

            const result = array.sliceOn(0);

            expect(result).toEqual([]);
        });
    });

    describe('Array.prototype.flatMap', () => {
        test('should return the flattened array', () => {
            const array = ['one', 'two', 'three'];

            const result = array.flatMap(() => array);

            expect(result).toEqual(['one', 'two', 'three', 'one', 'two', 'three', 'one', 'two', 'three']);
        });

        test('should return the same array if the callback doesn\'t set', () => {
            const array = ['one', 'two', 'three'];

            const result = array.flatMap();

            expect(result).toEqual(array);
        });
    });
});
