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
const pjson = require('./../package.json');

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
                        key: 'rp.attributes',
                        value: 'keyOne:valueOne',
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
                }
            ];

            const attributes = utils.getAttributes(variables);

            expect(attributes).toEqual(expectedAttributes);
        });

        test('should return correct array of attributes, key should be null', () => {
            const variables = {
                members: [
                    {
                        id: 'id',
                        key: 'rp.attributes',
                        value: 'valueOne',
                        type: 'string'
                    }
                ]
            };
            const expectedAttributes = [
                {
                    key: null,
                    value: 'valueOne'
                }
            ];

            const attributes = utils.getAttributes(variables);

            expect(attributes).toEqual(expectedAttributes);
        });

        test('should return empty array of attributes, if there is no match with rp.attributes namespace', () => {
            const variables = {
                members: [
                    {
                        id: 'id',
                        key: 'KeyOne',
                        value: 'valueOne',
                        type: 'string'
                    }
                ]
            };

            const attributes = utils.getAttributes(variables);

            expect(attributes).toEqual([]);
        });
    });

    describe('getClientInitObject', () => {
        test('should return client init object', () => {
            const options = {
                token: 'token',
                endpoint: 'endpoint',
                launch: 'launch',
                project: 'project',
                rerun: true,
                rerunOf: 'rerunOf',
                description: 'description',
                attributes: 'attributes',
                debug: true
            };

            const clientInitObject = utils.getClientInitObject(options);

            expect(clientInitObject).toEqual(options);
        });

        test('should return client init object with default launch name', () => {
            const options = {
                token: 'token',
                endpoint: 'endpoint',
                project: 'project',
                rerun: true,
                rerunOf: 'rerunOf',
                description: 'description',
                attributes: 'attributes',
                debug: true
            };

            const clientInitObject = utils.getClientInitObject(options);

            expect(clientInitObject).toEqual(Object.assign(options, { launch: 'Newman launch' }));
        });
    });

    describe('getStartLaunchObj', () => {
        test('should return start launch object', () => {
            const options = {
                launch: 'launch',
                description: 'description',
                attributes: [
                    {
                        key: 'YourKey',
                        value: 'YourValue'
                    }, {
                        value: 'YourValue'
                    }
                ],
                rerun: true,
                rerunOf: 'rerunOf'
            };

            const startLaunchObject = utils.getStartLaunchObj(options);

            expect(startLaunchObject).toEqual(Object.assign(options, {
                attributes: [{
                    key: 'YourKey',
                    value: 'YourValue'
                }, {
                    value: 'YourValue'
                }, {
                    key: 'agent',
                    value: `${pjson.name}|${pjson.version}`,
                    system: true
                }]
            }));
        });

        test('should return start launch object with default launch name', () => {
            const options = {
                description: 'description',
                attributes: [
                    {
                        key: 'YourKey',
                        value: 'YourValue'
                    }
                ],
                rerun: true,
                rerunOf: 'rerunOf'
            };

            const startLaunchObject = utils.getStartLaunchObj(options);

            expect(startLaunchObject).toEqual(Object.assign(options,
                { launch: 'Newman launch' },
                { attributes: [
                    {
                        key: 'YourKey',
                        value: 'YourValue'
                    }, {
                        key: 'agent',
                        value: `${pjson.name}|${pjson.version}`,
                        system: true
                    }
                ] }));
        });
    });

    describe('getCollectionPath', function () {
        test('should return correct collection path with separator', function () {
            jest.mock('path', () => ({
                sep: '\\'
            }));
            jest.spyOn(process, 'cwd').mockImplementation(() => 'C:\\testProject');
            const mockedTest = {
                filePath: 'C:\\testProject\\test\\example.js'
            };
            const expectedCollectionPath = 'test/example.js';

            const codeRef = utils.getCollectionPath(mockedTest.filePath);

            expect(codeRef).toEqual(expectedCollectionPath);
        });

        test('should return correct collection path without separator', function () {
            jest.mock('path', () => ({
                sep: '\\'
            }));
            jest.spyOn(process, 'cwd').mockImplementation(() => 'C:\\testProject');
            const mockedTest = {
                filePath: 'C:\\testProject\\example.js'
            };
            const expectedCollectionPath = 'example.js';

            const codeRef = utils.getCollectionPath(mockedTest.filePath);

            expect(codeRef).toEqual(expectedCollectionPath);
        });
    });

    describe('getCodeRef', function () {
        test('should return code ref', function () {
            const mockedTest = {
                testPath: 'example/Test',
                title: 'testTitle'
            };
            const expectedCodeRef = 'example/Test/testTitle';

            const codeRef = utils.getCodeRef(mockedTest.testPath, mockedTest.title);

            expect(codeRef).toEqual(expectedCodeRef);
        });
    });

    describe('getAgentInfo', () => {
        test('should contain version and name properties', () => {
            const agentParams = utils.getAgentInfo();

            expect(Object.keys(agentParams)).toContain('version');
            expect(Object.keys(agentParams)).toContain('name');
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
