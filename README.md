# @reportportal/agent-js-postman

Agent to integrate Postman (based on Newman collection runner) with ReportPortal.
* More about [Postman](https://www.postman.com/)
* More about [Newman](https://github.com/postmanlabs/newman)
* More about [ReportPortal](http://reportportal.io/)

## Installation
The installation should be global if newman is installed globally, otherwise - local (replace -g from the command below with -S for a local installation).

```cmd
npm install --save-dev @reportportal/newman-reporter-agent-js-postman
```

## Usage

There are two ways to enable this reporter - with command line or programmatically.

### With CLI

To enable this reporter you have to specify `agent-js-postman` in Newman's `-r` or `--reporters` option.

```cmd
newman run https://postman-echo.com/status/200 \
  -r @reportportal/agent-js-postman \
  --reporter-@reportportal/agent-js-postman-debug=true \
  --reporter-@reportportal/agent-js-postman-endpoint=https://your-instance.com:8080/api/v2 \
  --reporter-@reportportal/agent-js-postman-api-key=reportportalApiKey \
  --reporter-@reportportal/agent-js-postman-launch=LAUNCH_NAME \
  --reporter-@reportportal/agent-js-postman-project=PROJECT_NAME \
  --reporter-@reportportal/agent-js-postman-description=LAUNCH_DESCRIPTION \
  --reporter-@reportportal/agent-js-postman-attributes=launchKey:launchValue;launchValueTwo \
  -x
```

Pay attention that you **must** add **-x** or **--suppress-exit-code** parameter while running newman using CLI.

### Programmatically

```javascript
const newman = require("newman");

newman.run(
    {
        collection: "./collections/newman-test_collection.json",
        reporters: "@reportportal/agent-js-postman",
        reporter: {
            "@reportportal/agent-js-postman": {
                apiKey: "<API_KEY>",
                endpoint: "https://your.reportportal.server/api/v2",
                project: "Your reportportal project name",
                launch: "Your launch name",
                description: "Your launch description",
                attributes: [
                    {
                        "key": "launchKey",
                        "value": "launchValue"
                    },
                    {
                        "value": "launchValue"
                    },
                ],
                mode: "DEFAULT",
                debug: false
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

// To run several collections
// Note, this will create multiple launches, so you can merge into one manually via the UI or API
fs.readdir("./collections_folder_path", (err, files) => {
    if (err) {
        throw err;
    }
    files.forEach((file) => {
        // setup newman.run()
    });
});
```

## Options

The full list of available options presented below.

### Authentication Options

The agent supports two authentication methods:
1. **API Key Authentication** (default)
2. **OAuth 2.0 Password Grant** (recommended for enhanced security)

**Note:**\
If both authentication methods are provided, OAuth 2.0 will be used.\
Either API key or complete OAuth 2.0 configuration is required to connect to ReportPortal.

| Option | Necessity   | Default | Description                                                                                                                                                    |
|--------|-------------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| apiKey | Conditional |         | User's ReportPortal API key from which you want to send requests. It can be found on the profile page of this user. *Required only if OAuth is not configured. |
| oauth  | Conditional |         | OAuth 2.0 configuration object. When provided, OAuth authentication will be used instead of API key. See OAuth Configuration below.                            |

#### OAuth Configuration

The `oauth` object supports the following properties:

| Property              | Necessity  | Default  | Description                                                                                                                                                                                                                                                                                                                     |
|-----------------------|------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| tokenEndpoint         | Required   |          | OAuth 2.0 token endpoint URL for password grant flow.                                                                                                                                                                                                                                                                           |
| username              | Required   |          | Username for OAuth 2.0 password grant.                                                                                                                                                                                                                                                                                          |
| password              | Required   |          | Password for OAuth 2.0 password grant.                                                                                                                                                                                                                                                                                          |
| clientId              | Required   |          | OAuth 2.0 client ID.                                                                                                                                                                                                                                                                                                            |
| clientSecret          | Optional   |          | OAuth 2.0 client secret (optional, depending on your OAuth server configuration).                                                                                                                                                                                                                                               |
| scope                 | Optional   |          | OAuth 2.0 scope (optional, space-separated list of scopes).                                                                                                                                                                                                                                                                     |

**Note:** The OAuth interceptor automatically handles token refresh when the token is about to expire (1 minute before expiration).

##### OAuth 2.0 configuration example

```javascript
const rpConfig = {
  endpoint: 'https://your.reportportal.server/api/v2',
  project: 'Your reportportal project name',
  launch: 'Your launch name',
  oauth: {
    tokenEndpoint: 'https://your-oauth-server.com/oauth/token',
    username: 'your-username',
    password: 'your-password',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret', // optional
    scope: 'reportportal', // optional
  }
};
```

### General options

| Option                | Necessity  | Default   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|-----------------------|------------|-----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| endpoint              | Required   |           | URL of your server. For example 'https://server:8080/api/v1'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| launch                | Required   |           | Name of launch at creation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| project               | Required   |           | The name of the project in which the launches will be created.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| attributes            | Optional   | []        | Launch attributes. Programmatically - [{ "key": "YourKey", "value": "YourValue" }] <br/> with CLI - "YourKey:YourValue;YourValueTwo"                                                                                                                                                                                                                                                                                                                                                                                                             |
| description           | Optional   | ''        | Launch description.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| rerun                 | Optional   | false     | Enable [rerun](https://github.com/reportportal/documentation/blob/master/src/md/src/DevGuides/rerun.md)                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| rerunOf               | Optional   | Not set   | UUID of launch you want to rerun. If not specified, reportportal will update the latest launch with the same name                                                                                                                                                                                                                                                                                                                                                                                                                                |
| mode                  | Optional   | 'DEFAULT' | Results will be submitted to Launches page <br/> *'DEBUG'* - Results will be submitted to Debug page.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| skippedIssue          | Optional   | true      | reportportal provides feature to mark skipped tests as not 'To Investigate'. <br/> Option could be equal boolean values: <br/> *true* - skipped tests considered as issues and will be marked as 'To Investigate' on reportportal. <br/> *false* - skipped tests will not be marked as 'To Investigate' on application.                                                                                                                                                                                                                          |
| debug                 | Optional   | false     | This flag allows seeing the logs of the client-javascript. Useful for debugging.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| launchId              | Optional   | Not set   | The _ID_ of an already existing launch. The launch must be in 'IN_PROGRESS' status while the tests are running. Please note that if this _ID_ is provided, the launch will not be finished at the end of the run and must be finished separately.                                                                                                                                                                                                                                                                                                |
| restClientConfig      | Optional   | Not set   | `axios` like http client [config](https://github.com/axios/axios#request-config). May contain `agent` property for configure [http(s)](https://nodejs.org/api/https.html#https_https_request_url_options_callback) client, and other client options e.g. `proxy`, [`timeout`](https://github.com/reportportal/client-javascript#timeout-30000ms-on-axios-requests). For debugging and displaying logs the `debug: true` option can be used. <br/> Visit [client-javascript](https://github.com/reportportal/client-javascript) for more details. |
| headers               | Optional   | {}        | The object with custom headers for internal http client.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| launchUuidPrint       | Optional   | false     | Whether to print the current launch UUID.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| launchUuidPrintOutput | Optional   | 'STDOUT'  | Launch UUID printing output. Possible values: 'STDOUT', 'STDERR', 'FILE', 'ENVIRONMENT'. Works only if `launchUuidPrint` set to `true`. File format: `rp-launch-uuid-${launch_uuid}.tmp`. Env variable: `RP_LAUNCH_UUID`, note that the env variable is only available in the reporter process (it cannot be obtained from tests).                                                                                                                                                                                                               |

## Asynchronous API

The client supports an asynchronous reporting (via the ReportPortal asynchronous API).
If you want the client to report through the asynchronous API, change `v1` to `v2` in the `endpoint` address.

**Note:** It is highly recommended to use the `v2` endpoint for reporting, especially for extensive test suites.

## Reporting API

### Report static attributes
* To report attributes for suite you should use collection variables.

| VARIABLE      | INITIAL VALUE             | CURRENT VALUE             |
|---------------|---------------------------|---------------------------|
| rp.attributes | keySuiteOne:valueSuiteOne | keySuiteOne:valueSuiteOne |

* To report attributes for tests inside of Pre-request Script you should use the next method

**pm.environment.set**

| Parameter  | Required | Description                                                | Examples                                       |
|------------|----------|------------------------------------------------------------|------------------------------------------------|
| namespace  | true     | "string" - namespace, must be equal to the *rp.attributes* | "rp.attributes"                                |
| attributes | true     | "string" - contains set of pairs *key:value*               | "keyOne:valueOne;valueTwo;keyThree:valueThree" |

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

| VARIABLE                                               | INITIAL VALUE | CURRENT VALUE |
|--------------------------------------------------------|---------------|---------------|
| rp.launchStatus (for launch)<br/>rp.status (for suite) | your status   | your status   |

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

| Parameter | Required | Description                                            | Examples    |
|-----------|----------|--------------------------------------------------------|-------------|
| namespace | true     | "string" - namespace, must be equal to the *rp.status* | "rp.status" |
| status    | true     | "string" - status                                      | "passed"    |

### Logging
You can use the following methods to report logs with different log levels:

* console.log("launch/suite/test", "message");
* console.error("launch/suite/test", "message");
* console.debug("launch/suite/test", "message");
* console.warn("launch/suite/test", "message");
* console.info("launch/suite/test", "message");

| Parameter | Required | Description                                                                                            | Examples       |
|-----------|----------|--------------------------------------------------------------------------------------------------------|----------------|
| namespace | true     | "string" - namespace, must be equal to the *launch, suite or test* depends on where you want to report | "test"         |
| message   | true     | "string" - message                                                                                     | "your message" |

* Step doesn't support logs reporting

### Report test case id
* To report suite with test case id you should use collection variables

| VARIABLE      | INITIAL VALUE       | CURRENT VALUE       |
|---------------|---------------------|---------------------|
| rp.testCaseId | yourSuiteTestCaseId | yourSuiteTestCaseId |

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

| Parameter  | Required | Description                                                | Examples         |
|------------|----------|------------------------------------------------------------|------------------|
| namespace  | true     | "string" - namespace, must be equal to the *rp.testCaseId* | "rp.testCaseId"  |
| testCaseId | true     | "string" - test case id value                              | "yourTestCaseId" |

# Copyright Notice
Licensed under the [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0.html)
license (see the LICENSE.txt file).
