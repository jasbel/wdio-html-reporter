import HtmlGenerator from "./htmlGenerator.js";
import { HtmlReporterOptions, Metrics, ReportData } from "./types.js";
import { String } from 'typescript-string-operations';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
dayjs.extend(isSameOrBefore);
import copyFiles from "./copyFiles.js";
import open from 'open';
import fs from 'fs-extra';
import path from 'path';
import logger from '@wdio/logger';
import url from 'node:url';
import JsonGenerator from "./jsonGenerator.js";
const timeFormat = "YYYY-MM-DDTHH:mm:ss.SSS[Z]";
function walk(dir, extensions, filelist = []) {
    const files = fs.readdirSync(dir);
    files.forEach(function (file) {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            filelist = walk(filepath, extensions, filelist);
        }
        else {
            extensions.forEach(function (extension) {
                if (file.indexOf(extension) == file.length - extension.length) {
                    filelist.push(filepath);
                }
            });
        }
    });
    return filelist;
}
class ReportAggregator {
    constructor(opts) {
        this.LOG = logger('ReportAggregator');
        this.reportFile = "";
        this.options = Object.assign(new HtmlReporterOptions(), {
            outputDir: 'reports/html-reports/',
            filename: 'master-report.html',
            reportTitle: 'Test Master Report'
        }, opts);
        this.reports = [];
    }
    clean() {
        fs.emptyDirSync(this.options.outputDir);
    }
    readJsonFiles() {
        return walk(this.options.outputDir, [".json"]);
    }
    updateSuiteMetrics(metrics, suiteInfo) {
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
    async createReport() {
        this.LOG.info("Report Aggregation started");
        let metrics = new Metrics();
        let suites = [];
        let specs = [];
        let files = this.readJsonFiles();
        if (files.length == 0) {
            this.LOG.error(String.format("No Json files found in: {0}. Make sure options.produceJson is not false", this.options.outputDir));
        }
        for (let i = 0; i < files.length; i++) {
            try {
                let filename = files[i];
                let report = JSON.parse(fs.readFileSync(filename));
                if (!report.info || !report.info.specs) {
                    this.LOG.error("report structure in question, no info or info.specs ", JSON.stringify(report));
                    this.LOG.debug("report content: ", JSON.stringify(report));
                }
                report.info.specs.forEach((spec) => {
                    specs.push(spec);
                });
                this.reports.push(report);
            }
            catch (ex) {
                console.error(ex);
            }
        }
        this.reports.sort((report1, report2) => {
            let first = dayjs.utc(report1.info.start);
            let second = dayjs.utc(report2.info.start);
            if (first.isAfter(second)) {
                return 1;
            }
            else if (first.isBefore(second)) {
                return -1;
            }
            return 0;
        });
        for (let j = 0; j < this.reports.length; j++) {
            try {
                let report = this.reports[j];
                metrics.passed += report.metrics.passed;
                metrics.failed += report.metrics.failed;
                metrics.skipped += report.metrics.skipped;
                for (let k = 0; k < report.suites.length; k++) {
                    let suiteInfo = report.suites[k];
                    this.updateSuiteMetrics(metrics, suiteInfo);
                    suites.push(suiteInfo);
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
        if (!this.reports || !this.reports.length) {
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
            this.reports = [];
            this.reports.push(report);
        }
        this.LOG.info("Aggregated " + specs.length + " specs, " + suites.length + " suites, ");
        this.reportFile = path.join(process.cwd(), this.options.outputDir, this.options.filename);
        let reportData = new ReportData(this.options.reportTitle, this.reports[0].info, suites, metrics, this.reportFile, this.options.browserName);
        try {
            return JsonGenerator.jsonOutput(this.options, reportData)
                .then(HtmlGenerator.htmlOutput(this.options, reportData))
                .then(this.finalize())
                .then(this.LOG.info("Report Aggregation completed"));
        }
        catch (ex) {
            console.error("Report Aggregation failed: " + ex);
        }
        return Promise.resolve;
    }
    finalize() {
        const cssDir = url.fileURLToPath(new URL('../css/', import.meta.url));
        let jsFiles = cssDir;
        let reportDir = path.join(process.cwd(), this.options.outputDir);
        return copyFiles(jsFiles, reportDir)
            .then(() => {
            this.LOG.info('copied css : ' + jsFiles + " to " + reportDir);
            if (this.options.showInBrowser) {
                return open(this.reportFile)
                    .then(() => {
                    this.LOG.info("browser launched");
                    this.LOG.info('HTML Report Generation complete');
                });
            }
        });
        this.LOG.info('HTML Report Generation complete');
        return Promise.resolve();
    }
}
export default ReportAggregator;
