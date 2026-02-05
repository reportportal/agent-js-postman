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

const { getOptions, RPClient } = require('./mocks/reportportal-client.mock');
const Reporter = require('../lib/reporter');
const utils = require('../lib/utils');

const options = getOptions();

describe('reporter', () => {
  let reporter;

  beforeAll(() => {
    const emitter = {
      on: jest.fn(),
    };

    jest.spyOn(utils, 'getCollectionPath').mockImplementation(() => 'collectionPath');

    reporter = new Reporter(emitter, options, {}, RPClient);
    reporter.launchObj.tempId = 'startLaunch';
  });

  afterEach(() => {
    jest.clearAllMocks();
    reporter.tempLaunchId = '';
    reporter.tempSuiteId = '';
    reporter.tempTestId = '';
    reporter.collectionRunOptions = {};
    reporter.suitesInfoStack = [];
    reporter.collectionMap.clear();
  });

  afterAll(() => {
    reporter = null;
  });

  describe('constructor', () => {
    test('client and options should be defined', () => {
      expect(reporter.options).toBeDefined();
      expect(reporter.client).toBeDefined();
    });
  });

  describe('onConsole', () => {
    let getTime;

    beforeEach(() => {
      getTime = jest.spyOn(reporter, 'getTime').mockImplementation(() => 1234567891233);
    });

    afterEach(() => {
      getTime.mockRestore();
    });

    test('launchLogs, suiteLogs, testLogs should be empty array if there is an error', () => {
      expect(() => reporter.onConsole('error')).toThrowError('error');
      expect(reporter.launchLogs).toEqual([]);
      expect(reporter.suiteLogs).toEqual([]);
      expect(reporter.testLogs).toEqual([]);
    });

    test('should add log to launchLogs array if the messages\'s first element is equals to "launch"', () => {
      reporter.onConsole(null, {
        level: 'log',
        messages: ['launch', 'launch message'],
      });

      expect(reporter.launchLogs).toEqual([
        { level: 'INFO', message: 'launch message', time: 1234567891233 },
      ]);
    });

    test('should not add log to launchLogs if it is null', () => {
      reporter.launchLogs = null;
      reporter.onConsole(null, {
        level: 'log',
        messages: ['launch', 'launch message'],
      });

      expect(reporter.launchLogs).toEqual(null);
    });

    test('should add log to suiteLogs array if the messages\'s first element is equals to "suite"', () => {
      reporter.onConsole(null, {
        level: 'log',
        messages: ['suite', 'suite message'],
      });

      expect(reporter.suiteLogs).toEqual([
        { level: 'INFO', message: 'suite message', time: 1234567891233 },
      ]);
    });

    test('should not add log to suiteLogs if it is null', () => {
      reporter.suiteLogs = null;
      reporter.onConsole(null, {
        level: 'log',
        messages: ['suite', 'suite message'],
      });

      expect(reporter.suiteLogs).toEqual(null);
    });

    test('should add log to testLogs array if the messages\'s first element is equals to "test"', () => {
      reporter.onConsole(null, {
        level: 'log',
        messages: ['test', 'test message'],
      });

      expect(reporter.testLogs).toEqual([
        { level: 'INFO', message: 'test message', time: 1234567891233 },
      ]);
    });
  });

  describe('onStart', () => {
    test('should call client.startTestItem with parameters with type SUITE', () => {
      const expectedTestItemDataObj = {
        type: 'SUITE',
        name: 'name',
        description: 'content description',
        attributes: 'attributes',
        testCaseId: 'value',
        codeRef: 'collectionPath/name',
      };

      reporter.collectionRunOptions = {
        collection: {
          name: 'name',
          description: {
            content: 'content description',
          },
        },
      };
      jest.spyOn(utils, 'getAttributes').mockImplementation(() => 'attributes');
      jest.spyOn(utils, 'getCollectionVariablesByKey').mockImplementation(() => 'value');

      reporter.onStart(null, { cursor: { ref: 'ref' } });

      expect(reporter.client.startTestItem).toHaveBeenCalledTimes(1);
      expect(reporter.client.startTestItem).toHaveBeenCalledWith(
        expectedTestItemDataObj,
        'startLaunch',
      );
    });

    test('should not call client.startTestItem if there is an error', () => {
      expect(() => reporter.onStart('error')).toThrowError('error');
      expect(reporter.client.startTestItem).not.toHaveBeenCalled();
    });
  });

  describe('onBeforeRequest', () => {
    let sendRequestLogs;
    let getCurrentSuiteTempId;

    beforeEach(() => {
      sendRequestLogs = jest.spyOn(reporter, 'sendRequestLogs').mockImplementation(() => {});
      getCurrentSuiteTempId = jest
        .spyOn(reporter, 'getCurrentSuiteTempId')
        .mockImplementation(() => 'parentId');
    });

    afterEach(() => {
      sendRequestLogs.mockRestore();
      getCurrentSuiteTempId.mockRestore();
    });

    test('should call client.startTestItem with parameters with type TEST', () => {
      const testItemDataObj = {
        name: 'name',
        type: 'TEST',
        description: 'description',
        attributes: 'attributes',
        testCaseId: 'value',
        codeRef: 'collectionPath/suite/name',
        parameters: 'parameters',
      };
      const expectedCollectionMap = new Map([
        [
          'ref',
          {
            testId: 'startTestItem',
            requestId: 'id',
            steps: [],
            status: 'value',
          },
        ],
      ]);

      reporter.collectionRunOptions = {
        environment: {},
        collection: {
          name: 'suite',
        },
        iterationData: [{ path: 'post', value: 5 }],
      };
      jest.spyOn(utils, 'getAttributes').mockImplementation(() => 'attributes');
      jest.spyOn(utils, 'getParameters').mockImplementation(() => 'parameters');
      jest.spyOn(utils, 'getCollectionVariablesByKey').mockImplementation(() => 'value');

      reporter.onBeforeRequest(null, {
        item: { name: 'name', id: 'id' },
        cursor: { ref: 'ref', iteration: 0 },
        request: {
          description: { content: 'description' },
        },
      });

      expect(reporter.client.startTestItem).toHaveBeenCalledTimes(1);
      expect(reporter.client.startTestItem).toHaveBeenCalledWith(
        testItemDataObj,
        'startLaunch',
        'parentId',
      );
      expect(reporter.sendRequestLogs).toHaveBeenCalledWith('startTestItem', {
        description: { content: 'description' },
      });
      expect(reporter.collectionMap).toEqual(expectedCollectionMap);
    });

    test('should not call client.startTestItem if test name is null', () => {
      reporter.onBeforeRequest(null, {
        item: { id: 'id' },
        cursor: { ref: 'ref', iteration: 0 },
        request: {
          description: { content: 'description' },
        },
      });

      expect(reporter.client.startTestItem).not.toHaveBeenCalled();
    });

    test('should not call client.startTestItem if there is an error', () => {
      expect(() => reporter.onBeforeRequest('error')).toThrowError('error');
      expect(reporter.client.startTestItem).not.toHaveBeenCalled();
    });
  });

  describe('onBeforeTest', () => {
    test('Should extract correct stepName,testCaseId,status from the test script', () => {
      const expectedSteps = [
        {
          stepName: 'Test, status code is 400',
          testCaseId: 'testCaseIdForTestOneStepTwo',
          status: 'failed',
        },
        {
          stepName: 'Test, status code is 200',
          testCaseId: 'testCaseIdForTestOneStepOne',
          status: 'passed',
        },
      ];

      reporter.collectionMap = new Map([
        [
          'ref',
          {
            testId: 'startTestItem',
            steps: [],
          },
        ],
      ]);
      reporter.collectionRunOptions = {
        iterationData: ['parameters'],
        environment: {},
      };

      reporter.onBeforeTest(null, {
        events: [
          {
            listen: 'test',
            script: {
              exec: [
                'pm.test("Test, status code is 200", function () {\r',
                '    pm.variables.set("rp.testCaseId", "testCaseIdForTestOneStepOne");\r',
                '    pm.variables.set("rp.status","passed")\r',
                '    pm.response.to.have.status(300);\r',
                '});\r',
                'pm.test("Test, status code is 400", function () {\r',
                '    pm.variables.set("rp.testCaseId", "testCaseIdForTestOneStepTwo");\r',
                '    pm.variables.set("rp.status","failed")\r',
                '    pm.response.to.have.status(300);\r',
                '});',
              ],
            },
          },
        ],
        cursor: { ref: 'ref', iteration: 0 },
        item: { name: 'test' },
      });

      expect(reporter.collectionMap.get('ref').steps).toEqual(expectedSteps);
    });

    test('should not extract stepName,testCaseId,status from the test script in case of error', () => {
      expect(() => reporter.onBeforeTest('error')).toThrowError('error');

      reporter.collectionMap = new Map([
        [
          'ref',
          {
            testId: 'startTestItem',
            steps: [],
          },
        ],
      ]);

      expect(reporter.collectionMap.get('ref').steps).toEqual([]);
    });
  });

  describe('finishStep', () => {
    test('should not call client.finishTestItem if testObj is empty', () => {
      reporter.collectionMap = new Map([
        [
          'ref',
          {
            testId: 'startTestItem',
            steps: [],
          },
        ],
      ]);

      reporter.finishStep(null, { cursor: { ref: 'stepRef' } });

      expect(reporter.client.finishTestItem).not.toHaveBeenCalled();
    });

    test('Should call this.startTestStep with correct arguments', () => {
      const mockedTestAssertion = {
        assertion: 'Test step name',
        cursor: { iteration: 1, ref: 'ref' },
        item: { name: 'item name' },
      };

      reporter.collectionRunOptions = new Map([
        ['ref', { collection: { name: 'collectionName' } }],
      ]);

      reporter.collectionMap = new Map([
        [
          'ref',
          {
            testId: 'testId',
            steps: [
              {
                stepId: 'stepId',
                requestId: 'id',
                stepName: 'Step name',
              },
            ],
          },
        ],
      ]);

      reporter.startTestStep = jest.fn().mockReturnValueOnce({ tempId: 'tempId' });

      reporter.finishStep(null, mockedTestAssertion);

      expect(reporter.startTestStep).toHaveBeenCalledTimes(1);
      expect(reporter.startTestStep).toHaveBeenCalledWith({
        stepName: 'Test step name',
        result: mockedTestAssertion,
        currentStepData: { stepId: 'stepId', requestId: 'id', stepName: 'Step name' },
        testObj: { testId: 'testId', steps: [] },
      });
    });

    test('should call logMessage and client.finishTestItem if there is an error, status is failed', () => {
      reporter.collectionMap = new Map([
        [
          'ref',
          {
            testId: 'testId',
            steps: [
              {
                stepId: 'stepId',
                requestId: 'id',
                stepName: 'Step name',
              },
            ],
          },
        ],
      ]);
      reporter.startTestStep = jest.fn().mockReturnValueOnce({ tempId: 'tempId' });

      jest.spyOn(reporter, 'logMessage');

      reporter.finishStep({ message: 'error' }, { cursor: { ref: 'ref' }, assertion: 'Step name' });

      expect(reporter.logMessage).toHaveBeenCalledWith('tempId', 'error', 'ERROR');
      expect(reporter.client.finishTestItem).toHaveBeenCalledWith('tempId', { status: 'FAILED' });
      expect(reporter.collectionMap.get('ref')).toEqual({ testId: 'testId', steps: [] });
    });

    test('should call client.finishTestItem with status passed if there is no error', () => {
      reporter.collectionMap = new Map([
        [
          'ref',
          {
            testId: 'testId',
            steps: [
              {
                stepId: 'stepId',
                requestId: 'id',
                name: 'Step name',
              },
            ],
          },
        ],
      ]);
      jest.spyOn(reporter, 'logMessage');

      reporter.startTestStep = jest.fn().mockReturnValueOnce({ tempId: 'tempId' });

      reporter.finishStep(null, { cursor: { ref: 'ref' }, assertion: 'Step name' });

      expect(reporter.logMessage).not.toHaveBeenCalled();
      expect(reporter.client.finishTestItem).toHaveBeenCalledWith('tempId', { status: 'PASSED' });
      expect(reporter.collectionMap.get('ref')).toEqual({ testId: 'testId', steps: [] });
    });
  });

  describe('finishAllSteps', () => {
    test('should not call interruptAllSteps if there is an error', () => {
      jest.spyOn(reporter, 'interruptAllSteps');

      expect(() => reporter.finishAllSteps('error')).toThrowError('error');
      expect(reporter.interruptAllSteps).not.toHaveBeenCalled();
    });

    test('should call interruptAllSteps if testResult contain steps at the end of the test', () => {
      const testObj = {
        testId: 'testId',
        steps: [
          {
            stepId: 'stepId',
            requestId: 'id',
            stepName: 'Step name',
          },
          {
            stepId: 'stepIdTwo',
            requestId: 'idTwo',
            stepName: 'Step name two',
          },
        ],
      };
      const testResultObj = {
        item: {
          name: 'Item name',
        },
        cursor: { ref: 'ref' },
        executions: [],
      };

      reporter.collectionMap = new Map([['ref', testObj]]);
      jest.spyOn(reporter, 'interruptAllSteps');

      reporter.startTestStep = jest.fn().mockReturnValue({ tempId: 'r211e1' });

      reporter.finishAllSteps(null, testResultObj);

      expect(reporter.startTestStep).toHaveBeenCalledTimes(testObj.steps.length);
      expect(reporter.interruptAllSteps).toHaveBeenCalledTimes(1);
      expect(reporter.interruptAllSteps).toHaveBeenCalledWith(testObj, 'Unknown error occurred');
    });

    test('should call interruptAllSteps with parameters if testResult contains execution with error', () => {
      const testObj = {
        testId: 'testId',
        steps: [
          {
            stepId: 'stepId',
            requestId: 'id',
            stepName: 'Step name',
          },
          {
            stepId: 'stepIdTwo',
            requestId: 'idTwo',
            stepName: 'Step name two',
          },
        ],
      };
      const testResultObj = {
        cursor: { ref: 'ref' },
        executions: [{ error: { message: 'error' } }],
      };

      reporter.collectionMap = new Map([['ref', testObj]]);
      jest.spyOn(reporter, 'interruptAllSteps');
      reporter.startTestStep = jest.fn().mockReturnValue({ tempId: 'r211e1' });

      reporter.finishAllSteps(null, testResultObj);

      expect(reporter.startTestStep).toHaveBeenCalledTimes(testObj.steps.length);
      expect(reporter.interruptAllSteps).toHaveBeenCalledWith(testObj, 'error');
    });
  });

  describe('onRequest', () => {
    test('should update collectionMap with error and response values if testObj exists', () => {
      const testObj = {
        testId: 'testId',
        steps: [],
      };
      const expectedTestObj = {
        testId: 'testId',
        steps: [],
        response: 'response',
        error: 'error',
      };

      reporter.collectionMap = new Map([['ref', testObj]]);

      reporter.onRequest('error', { cursor: { ref: 'ref' }, response: 'response' });

      expect(reporter.collectionMap.get('ref')).toEqual(expectedTestObj);
    });

    test("should not update collectionMap with error and response values if testObj doesn't exist", () => {
      const testObj = {
        testId: 'testId',
        steps: [],
      };

      reporter.collectionMap = new Map([['ref', testObj]]);

      reporter.onRequest('error', { cursor: { ref: 'refRequest' }, response: 'response' });

      expect(reporter.collectionMap.get('ref')).toEqual(testObj);
    });
  });

  describe('finishTest', () => {
    let sendResponseLogs;

    beforeEach(() => {
      sendResponseLogs = jest.spyOn(reporter, 'sendResponseLogs').mockImplementation(() => {});
    });

    afterEach(() => {
      sendResponseLogs.mockRestore();
    });

    test('should not call client.finishTestItem if there is an error', () => {
      expect(() => reporter.finishTest('error')).toThrowError('error');
      expect(reporter.client.finishTestItem).not.toHaveBeenCalled();
    });

    test("should not call client.finishTestItem if testObj doesn't exist", () => {
      const testObj = {
        testId: 'testId',
        steps: [],
        error: undefined,
      };

      reporter.collectionMap = new Map([['ref', testObj]]);

      reporter.finishTest(null, { cursor: { ref: 'refRequest' } });

      expect(reporter.client.finishTestItem).not.toHaveBeenCalled();
    });

    test('should call logMessage with ERROR and client.finishTestItem with status failed if testObj has error value', () => {
      const testObj = {
        testId: 'testId',
        steps: [],
        error: { message: 'error' },
      };

      reporter.collectionMap = new Map([['ref', testObj]]);
      jest.spyOn(reporter, 'logMessage');

      reporter.finishTest(null, { cursor: { ref: 'ref' } });

      expect(reporter.logMessage).toHaveBeenCalledWith('testId', 'error', 'ERROR');
      expect(reporter.client.finishTestItem).toHaveBeenCalledWith('testId', { status: 'FAILED' });
    });

    test('should call sendResponseLogs and client.finishTestItem with status passed if testObj has response', () => {
      const testObj = {
        testId: 'testId',
        steps: [],
        error: undefined,
        response: { headers: { members: ['members'] } },
      };

      reporter.collectionMap = new Map([['ref', testObj]]);

      reporter.finishTest(null, { cursor: { ref: 'ref' } });

      expect(reporter.sendResponseLogs).toHaveBeenCalledWith('testId', {
        headers: { members: ['members'] },
      });
      expect(reporter.client.finishTestItem).toHaveBeenCalledWith('testId', { status: 'PASSED' });
    });

    test("should not call sendResponseLogs if testObj hasn't response", () => {
      const testObj = {
        testId: 'testId',
        steps: [],
        error: undefined,
      };

      reporter.collectionMap = new Map([['ref', testObj]]);

      reporter.finishTest(null, { cursor: { ref: 'ref' } });

      expect(reporter.sendResponseLogs).not.toHaveBeenCalledWith();
      expect(reporter.client.finishTestItem).toHaveBeenCalledWith('testId', { status: 'PASSED' });
    });
  });

  describe('onBeforeDone', () => {
    let finishSuite;

    beforeEach(() => {
      finishSuite = jest.spyOn(reporter, 'finishSuite').mockImplementation(() => {});
    });

    afterEach(() => {
      finishSuite.mockRestore();
    });

    test('should call finishSuite', () => {
      reporter.onBeforeDone();

      expect(reporter.finishSuite).toHaveBeenCalledTimes(1);
      expect(reporter.finishSuite).toHaveBeenCalledWith();
    });

    test('should not call finishSuite if there is an error', () => {
      expect(() => reporter.onBeforeDone('error')).toThrowError('error');
      expect(reporter.finishSuite).not.toHaveBeenCalled();
    });
  });

  describe('onDone', () => {
    test('should call client.finishLaunch with parameters, status is failed', () => {
      reporter.collectionRunOptions.collection = {};
      jest.spyOn(utils, 'getCollectionVariablesByKey').mockImplementation(() => undefined);

      reporter.onDone(null, {
        run: { failures: 'failures' },
      });

      expect(reporter.client.finishLaunch).toHaveBeenCalledTimes(1);
      expect(reporter.client.finishLaunch).toHaveBeenCalledWith('startLaunch', {
        status: 'FAILED',
      });
    });

    test('should call client.finishLaunch with parameters, status is passed', () => {
      reporter.collectionRunOptions.collection = {};
      jest.spyOn(utils, 'getCollectionVariablesByKey').mockImplementation(() => undefined);

      reporter.onDone(null, {
        run: {},
      });

      expect(reporter.client.finishLaunch).toHaveBeenCalledTimes(1);
      expect(reporter.client.finishLaunch).toHaveBeenCalledWith('startLaunch', {
        status: 'PASSED',
      });
    });

    test('should call client.finishLaunch with parameters, status is skipped', () => {
      reporter.collectionRunOptions.collection = {};
      jest.spyOn(utils, 'getCollectionVariablesByKey').mockImplementation(() => 'skipped');

      reporter.onDone(null, {
        run: {},
      });

      expect(reporter.client.finishLaunch).toHaveBeenCalledTimes(1);
      expect(reporter.client.finishLaunch).toHaveBeenCalledWith('startLaunch', {
        status: 'skipped',
      });
    });

    test('should not call client.finishLaunch if there is an error', () => {
      expect(() => reporter.onDone('error')).toThrowError('error');
      expect(reporter.client.finishLaunch).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentSuiteTempId', () => {
    test('should return current suite tempId if suitesInfoStack is not empty', () => {
      reporter.suitesInfoStack = [{ tempId: 'tempId' }];

      const tempId = reporter.getCurrentSuiteTempId();

      expect(tempId).toEqual('tempId');
    });

    test('should return null if suitesInfoStack is empty', () => {
      reporter.suitesInfoStack = [];

      const tempId = reporter.getCurrentSuiteTempId();

      expect(tempId).toEqual(null);
    });
  });

  describe('getTestName', () => {
    test('should return null if test name as parameter is not defined', () => {
      const testName = reporter.getTestName({ cursor: { iteration: 0 }, item: {} });

      expect(testName).toEqual(null);
    });

    test('should return test name with iteration number if iterationCount is not undefined', () => {
      const expectedTestName = 'name #1';

      reporter.collectionRunOptions.iterationCount = 4;

      const testName = reporter.getTestName({ cursor: { iteration: 0 }, item: { name: 'name' } });

      expect(testName).toEqual(expectedTestName);
    });

    test('should return test name without iteration number if iterationCount is undefined', () => {
      const expectedTestName = 'name';

      reporter.collectionRunOptions.iterationCount = undefined;

      const testName = reporter.getTestName({ cursor: { iteration: 0 }, item: { name: 'name' } });

      expect(testName).toEqual(expectedTestName);
    });
  });

  describe('logMessage', () => {
    test('should call client.sendLog with parameters', () => {
      jest.spyOn(reporter, 'getTime').mockImplementation(() => 1234567891233);
      reporter.logMessage('id', 'value', 'level');

      expect(reporter.client.sendLog).toHaveBeenCalledTimes(1);
      expect(reporter.client.sendLog).toHaveBeenCalledWith('id', {
        level: 'level',
        message: 'value',
        time: 1234567891233,
      });
    });

    test('should call client.sendLog with parameters, default level', () => {
      jest.spyOn(reporter, 'getTime').mockImplementation(() => 1234567891233);
      reporter.logMessage('id', 'value');

      expect(reporter.client.sendLog).toHaveBeenCalledTimes(1);
      expect(reporter.client.sendLog).toHaveBeenCalledWith('id', {
        level: 'INFO',
        message: 'value',
        time: 1234567891233,
      });
    });
  });

  describe('sendRequestLogs', () => {
    test('should call logMessage with parameters two times', () => {
      jest.spyOn(reporter, 'logMessage').mockImplementation(() => {});

      reporter.sendRequestLogs('stepId', {
        url: {
          toString: () => 'https://postman-echo.com',
        },
        method: 'method',
        headers: { members: [] },
      });

      expect(reporter.logMessage).toHaveBeenCalledTimes(2);
      expect(reporter.logMessage).toHaveBeenCalledWith(
        'stepId',
        'Request: URL: https://postman-echo.com',
      );
      expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Method: method');
    });

    test('should call logMessage with parameters three times if headers array is not empty', () => {
      jest.spyOn(reporter, 'logMessage').mockImplementation(() => {});

      reporter.sendRequestLogs('stepId', {
        url: {
          toString: () => 'https://postman-echo.com',
        },
        method: 'method',
        headers: { members: [{ key: 'key', value: 'value' }] },
      });

      expect(reporter.logMessage).toHaveBeenCalledTimes(3);
      expect(reporter.logMessage).toHaveBeenCalledWith(
        'stepId',
        'Request: URL: https://postman-echo.com',
      );
      expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Method: method');
      expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Headers: key:value');
    });

    test('should call logMessage with parameters four times if body exist', () => {
      jest.spyOn(reporter, 'logMessage').mockImplementation(() => {});

      reporter.sendRequestLogs('stepId', {
        url: {
          toString: () => 'https://postman-echo.com',
        },
        method: 'method',
        headers: { members: [{ key: 'key', value: 'value' }] },
        body: {
          toString: () => 'body',
        },
      });

      expect(reporter.logMessage).toHaveBeenCalledTimes(4);
      expect(reporter.logMessage).toHaveBeenCalledWith(
        'stepId',
        'Request: URL: https://postman-echo.com',
      );
      expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Method: method');
      expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Headers: key:value');
      expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Body: body');
    });
  });

  describe('sendLaunchLogMessage', () => {
    test('should call logMessage with parameters and launch id', () => {
      reporter.launchObj.tempId = 'launchId';
      jest.spyOn(reporter, 'logMessage').mockImplementation(() => {});

      reporter.sendLaunchLogMessage('launch message', 'info', 1234567891233);

      expect(reporter.logMessage).toHaveBeenCalledTimes(1);
      expect(reporter.logMessage).toHaveBeenCalledWith(
        'launchId',
        'launch message',
        'info',
        1234567891233,
      );
    });
  });

  describe('sendResponseLogs', () => {
    test('should call logMessage with parameters four times', () => {
      jest.spyOn(reporter, 'logMessage').mockImplementation(() => {});
      jest.spyOn(reporter.decoder, 'write').mockImplementation(() => 'body');

      reporter.sendResponseLogs('stepId', {
        code: 'code',
        status: 'status',
        headers: { members: [{ key: 'key', value: 'value' }] },
        stream: {},
      });

      expect(reporter.logMessage).toHaveBeenCalledTimes(4);
      expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Response: Code: code');
      expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Response: Status: status');
      expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Response: Headers: key:value');
      expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Response: Body: body');
    });
  });

  describe('interruptAllSteps', () => {
    test('should call client.finishTestItem with status failed and logMessage with error', () => {
      const testObj = {
        steps: [
          {
            stepId: 'startTestItem',
          },
        ],
      };

      jest.spyOn(reporter, 'logMessage');

      reporter.interruptAllSteps(testObj, 'error');

      expect(reporter.logMessage).toHaveBeenCalledWith('startTestItem', 'error', 'ERROR');
      expect(reporter.client.finishTestItem).toHaveBeenCalledWith('startTestItem', {
        status: 'INTERRUPTED',
      });
    });
  });

  describe('finishSuite', () => {
    let getCurrentSuiteTempId;

    beforeEach(() => {
      getCurrentSuiteTempId = jest
        .spyOn(reporter, 'getCurrentSuiteTempId')
        .mockImplementation(() => 'parentId');
    });

    afterEach(() => {
      getCurrentSuiteTempId.mockRestore();
    });

    test('should call client.finishTestItem with correct parameters', () => {
      reporter.finishSuite();

      expect(reporter.client.finishTestItem).toHaveBeenCalledWith('parentId', {});
    });
  });
});
