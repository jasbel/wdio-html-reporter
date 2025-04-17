import { HtmlReporterOptions, Metrics } from "./types.js";
import { SuiteStats } from "@wdio/reporter";
declare class ReportAggregator {
    private LOG;
    constructor(opts: HtmlReporterOptions);
    options: HtmlReporterOptions;
    reportFile: string;
    reports: any[];
    clean(): void;
    readJsonFiles(): string[];
    updateSuiteMetrics(metrics: Metrics, suiteInfo: SuiteStats): void;
    createReport(): Promise<any>;
    finalize(): Promise<void>;
}
export default ReportAggregator;
