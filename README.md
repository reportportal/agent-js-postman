# @reportportal/agent-js-postman

Newman runtime reporter for ReportPortal which provides information about collection run.
[ReportPortal](http://reportportal.io/)<br>
[ReportPortal on GitHub](https://github.com/reportportal)

### How to use
The installation should be global if newman is installed globally, otherwise - local (replace -g from the command below with -S for a local installation).

```bash
$ npm install -g @reportportal/agent-js-postman
```

### Usage

There are two ways to enable this reporter - with command line or programmatically.

#### With CLI

To enable this reporter you have to specify `reportportal` in Newman's `-r` or `--reporters` option.

```bash
$ newman run https://postman-echo.com/status/200 \
    -r @reportportal/reportportal \
    --reporter-@reportportal/reportportal-debug=true \
    --reporter-@reportportal/reportportal-endpoint=http://your-instance.com:8080/api/v1 \
    --reporter-@reportportal/reportportal-token=00000000-0000-0000-0000-000000000000 \
    --reporter-@reportportal/reportportal-launch=LAUNCH_NAME \
    --reporter-@reportportal/reportportal-project=PROJECT_NAME \
    --reporter-@reportportal/reportportal-description=LAUNCH_DESCRIPTION \
    -x
```

Pay attention that you **must** add **-x** or **--suppress-exit-code** parameter while running newman using CLI.

#### Programmatically

```javascript
const newman = require("newman");

newman.run(
    {
        collection: "./collections/newman-test_collection.json",
        reporters: "@reportportal/reportportal",
        reporter: {
            "@reportportal/reportportal": {
                endpoint: "http://your-instance.com:8080/api/v1",
                token: "00000000-0000-0000-0000-000000000000",
                launch: "LAUNCH_NAME",
                project: "PROJECT_NAME",
                description: "LAUNCH_DESCRIPTION",
                attributes: [
                    {
                        "key": "launchKey",
                        "value": "launchValue"
                    },
                    {
                        "value": "launchValue"
                    },
                ],
                mode: 'DEFAULT',
                debug: true
            }
        }
    },
    function(err) {
        if (err) {
            throw err;
        }
        console.log("collection run complete!");
    }
);
```

#### Options

Both CLI and programmatic runs support following options:

| Parameter | Description                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| token     | User's Report Portal token from which you want to send requests. It can be found on the profile page of this user. |
| endpoint  | URL of your server. For example 'https://server:8080/api/v1'.                                                     |
| launch    | Name of launch at creation.                                                                                       |
| project   | The name of the project in which the launches will be created.                                                      |
| description   | Text description of launch.                                                                                     |
| rerun     | Enable [rerun](https://github.com/reportportal/documentation/blob/master/src/md/src/DevGuides/rerun.md)                                                  |
| rerunOf   | UUID of launch you want to rerun. If not specified, report portal will update the latest launch with the same name.                                                                                     |
| debug     | Determines whether newman's run should be logged in details.                                                      |
| mode     | Launch mode. Allowable values *DEFAULT* (by default) or *DEBUG*.                                                      |

### Report static attributes
* To report attributes for suite you should use collection variables.

VARIABLE | INITIAL VALUE | CURRENT VALUE
--------- | ----------- | -----------
rp.attributes | keySuiteOne:valueSuiteOne | keySuiteOne:valueSuiteOne

* To report attributes for tests inside of Pre-request Script you should use the next method

**pm.environment.set**

Parameter | Required | Description | Examples
--------- | ----------- | ----------- | -----------
namespace | true | "string" - namespace, must be equal to the *rp.attributes* | "rp.attributes"
attributes | true | "string" - contains set of pairs *key:value* | "keyOne:valueOne;valueTwo;keyThree:valueThree"

```javascript
pm.environment.set("rp.attributes", "keyOne:valueOne;valueTwo;keyThree:valueThree");
```
* Step doesn't support reporting with attributes

### Report static description
Both suites and tests support description. For reporting with description you should click on **Edit** in your collection
 and in the description column enter the text you need

* Step doesn't support reporting with description

### Finish with status
**status** must be equal to one of the following values: **passed, failed, stopped, skipped, interrupted, cancelled, info, warn**.<br/>

* To finish launch/suite with status you should use collection variables

VARIABLE | INITIAL VALUE | CURRENT VALUE
--------- | ----------- | -----------
rp.launchStatus (for launch)<br/>rp.status (for suite) | your status | your status

* To finish tests you should use environment variables inside of Pre-request Script
```javascript
pm.environment.set("rp.status", "status");
```
* To finish steps with statuses you should use local variables
```javascript
pm.variables.set("rp.status", "status");
```
**It is important that the code line above has to start from the new line and you shouldn't forget about semicolon after it**

For both tests or steps, this is true

Parameter | Required | Description | Examples
--------- | ----------- | ----------- | -----------
namespace | true | "string" - namespace, must be equal to the *rp.status* | "rp.status"
status | true | "string" - status | "passed"

### Logging
You can use the following methods to report logs with different log levels:

* console.log("launch/suite/test", "message");
* console.error("launch/suite/test", "message");
* console.debug("launch/suite/test", "message");
* console.warn("launch/suite/test", "message");
* console.info("launch/suite/test", "message");

Parameter | Required | Description | Examples
--------- | ----------- | ----------- | -----------
namespace | true | "string" - namespace, must be equal to the *launch, suite or test* depends on where you want to report | "test"
message | true | "string" - message | "your message"

* Step doesn't support logs reporting

### Report test case id
* To report suite with test case id you should use collection variables

VARIABLE | INITIAL VALUE | CURRENT VALUE
--------- | ----------- | -----------
rp.testCaseId | yourSuiteTestCaseId | yourSuiteTestCaseId

* To report tests with test case id you should use environment variables inside of Pre-request Script
```javascript
pm.environment.set("rp.testCaseId", "yourTestCaseId");
```
* To report steps with test case id you should use local variables
```javascript
pm.variables.set("rp.testCaseId", "stepTestCaseId");
```
**It is important that the code line above has to start from the new line and you shouldn't forget about semicolon after it**

For both tests or steps, this is true

Parameter | Required | Description | Examples
--------- | ----------- | ----------- | -----------
namespace | true | "string" - namespace, must be equal to the *rp.testCaseId* | "rp.testCaseId"
testCaseId | true | "string" - test case id value | "yourTestCaseId"

# Copyright Notice
Licensed under the [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0.html)
license (see the LICENSE.txt file).
