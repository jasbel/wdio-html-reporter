import logger from '@wdio/logger';
import json from 'big-json';
import fs from 'fs-extra';
class JsonGenerator {
    static writeJson(jsonFile, stringified, reportOptions, reportData) {
        fs.outputFileSync(jsonFile, stringified);
        JsonGenerator.LOG.info("Json write completed: " + jsonFile);
    }
    static serializeJson(jsonFile, reportOptions, reportData) {
        JsonGenerator.LOG.info("Json stringify starting: " + jsonFile);
        return json.stringify({ body: reportData })
            .then(stringified => {
            try {
                JsonGenerator.LOG.info("Json stringify complete");
                JsonGenerator.writeJson(jsonFile, stringified, reportOptions, reportData);
            }
            catch (error) {
                JsonGenerator.LOG.error("Json write failed: " + error);
            }
        });
    }
    static jsonOutput(reportOptions, reportData) {
        try {
            if (fs.pathExistsSync(reportOptions.outputDir)) {
                if (reportOptions.removeOutput) {
                    for (let i = 0; i < reportData.suites.length; i++) {
                        let suite = reportData.suites[i];
                        for (let j = 0; j < suite.tests.length; j++) {
                            let test = suite.tests[j];
                            test.output = [];
                        }
                    }
                }
                if (reportOptions.produceJson) {
                    let jsonFile = reportData.reportFile.replace('.html', '.json');
                    return this.serializeJson(jsonFile, reportOptions, reportData);
                }
                else {
                    JsonGenerator.LOG.info("reportOptions.produceJson is false");
                    return Promise.resolve();
                }
            }
        }
        catch (ex) {
            JsonGenerator.LOG.error("Json Generation processing ended in error: " + ex);
            return Promise.resolve();
        }
    }
}
JsonGenerator.LOG = logger('JsonGenerator');
export default JsonGenerator;
