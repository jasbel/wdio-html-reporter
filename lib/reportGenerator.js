import HtmlGenerator from "./htmlGenerator.js";
import { Metrics } from "./types.js";
import { String } from 'typescript-string-operations';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
dayjs.extend(isSameOrBefore);
import path from 'path';
import logger from '@wdio/logger';
import JsonGenerator from "./jsonGenerator.js";
const timeFormat = "YYYY-MM-DDTHH:mm:ss.SSS[Z]";
class ReportGenerator {
    constructor(opts) {
        this.LOG = logger('ReportGenerator');
        this.reportFile = "";
        this.synchronised = false;
        opts = Object.assign({}, {
            outputDir: 'reports/html-reports/',
            filename: 'master-report.html',
            reportTitle: 'Test Master Report',
            showInBrowser: false,
            browserName: "not specified",
            collapseTests: false,
            collapseSuites: false,
            LOG: null,
            removeOutput: true
        }, opts);
        this.options = opts;
    }
    isSynchronised() {
        return this.synchronised;
    }
    updateSuiteMetrics(metrics, suiteInfo) {
        // metrics.passed += suite.metrics.passed;
        // metrics.failed += suite.metrics.failed;
        // metrics.skipped += suite.metrics.skipped;
        let start = dayjs.utc(suiteInfo.start);
        if (metrics.start) {
            if (start.isBefore(metrics.start)) {
                metrics.start = start.utc().format(timeFormat);
            }
        }
        else {
            metrics.start = start.utc().format(timeFormat);
        }
        let end = dayjs.utc(suiteInfo.end);
        if (metrics.end) {
            if (end.isAfter(dayjs.utc(metrics.end))) {
                metrics.end = end.utc().format(timeFormat);
            }
        }
        else {
            metrics.end = end.utc().format(timeFormat);
        }
        this.LOG.info(String.format("Included metrics for suite: {0} {1}", suiteInfo.cid, suiteInfo.uid));
    }
    async createReport(reportData) {
        this.synchronised = false;
        this.LOG.info("Report Generation started");
        let metrics = new Metrics();
        let suites = reportData.suites;
        let specs = reportData.info.specs;
        for (let j = 0; j < suites.length; j++) {
            try {
                let suite = suites[j];
                this.updateSuiteMetrics(metrics, suite);
                if (suite.suites) {
                    for (let k = 0; k < suite.suites.length; k++) {
                        let suiteInfo = suite.suites[k];
                        this.updateSuiteMetrics(metrics, suiteInfo);
                    }
                }
            }
            catch (ex) {
                console.error(ex);
            }
        }
        if (!metrics.start || !metrics.end) {
            this.LOG.error(String.format("Invalid Metrics computed: {0} -- {1}", metrics.start, metrics.end));
        }
        metrics.duration = dayjs.duration(dayjs(metrics.end).utc().diff(dayjs(metrics.start).utc())).as('milliseconds');
        if (!suites || !suites.length) {
            // the test failed hard at the beginning.  Create a dummy structure to get through html generation
            let report = {
                "info": {
                    "cid": "The execution of the test suite has failed before report generation was started.  Please look at the logs to determine the error, this is likely an issue with your configuration files.",
                    "config": {
                        "hostname": "localhost"
                    },
                    "specs": [],
                    "suites": [
                        {
                            "uid": "Test Start Failure",
                            "title": "Test Start Failure",
                            "type": "suite",
                            "tests": [],
                        }
                    ]
                }
            };
        }
        this.LOG.info("Generated " + specs.length + " specs, " + suites.length + " suites, ");
        this.reportFile = path.join(process.cwd(), this.options.outputDir, this.options.filename);
        reportData.reportFile = this.reportFile;
        try {
            reportData.reportFile = reportData.reportFile.replace('.html', String.format('-{0}.html', reportData.info.cid));
            return JsonGenerator.jsonOutput(this.options, reportData)
                .then(() => {
                if (this.options.produceHtml) {
                    HtmlGenerator.htmlOutput(this.options, reportData);
                }
            })
                .then(() => {
                this.LOG.info("Report Generation completed");
                this.synchronised = true;
            });
        }
        catch (ex) {
            console.error("Report Generation failed: " + ex);
            this.synchronised = true;
        }
    }
}
export default ReportGenerator;
