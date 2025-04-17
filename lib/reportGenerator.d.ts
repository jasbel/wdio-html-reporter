import { HtmlReporterOptions, Metrics, ReportData } from "./types.js";
import { SuiteStats } from "@wdio/reporter";
declare class ReportGenerator {
    private LOG;
    constructor(opts: HtmlReporterOptions);
    options: HtmlReporterOptions;
    reportFile: string;
    synchronised: boolean;
    isSynchronised(): boolean;
    updateSuiteMetrics(metrics: Metrics, suiteInfo: SuiteStats): void;
    createReport(reportData: ReportData): Promise<any>;
}
export default ReportGenerator;
