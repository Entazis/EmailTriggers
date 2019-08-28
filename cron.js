const cronManager = require('../services/cron-manager/cron-manager');
const config = require('@codeberry/nodejs').config;
const logger = require('@codeberry/nodejs').logger;
const queries = require('./queries');
const processWeeklyReportEmails = require('./send-weekly-report-emails');
const processTimehopYesterdayEmails = require('./send-timehop-yesterday-emails');
const processTimehop7DaysAgo = require('./send-timehop-7-days-ago-emails');

const _sendWeeklyReportEmails = async function () {
    const debugDate = null;
    const users = await queries.queryUsersForWeeklyReport(debugDate);

    const promises = users.map(user => processWeeklyReportEmails.handleProcess(user, debugDate)).map(handleRejection);
    return Promise.all(promises);

    function handleRejection(promise) {
        return promise.catch(error => logger.error("CRON | Send weekly report emails | Error.", {detailedMessage: error}));
    }

};
const _sendTimehopYesterdayEmails = async function () {
    const debugDate = null;
    const users = await queries.queryUsersForTimehopYesterday(debugDate);

    const promises = users.map(user => processTimehopYesterdayEmails.handleProcess(user, debugDate)).map(handleRejection);
    return Promise.all(promises);

    function handleRejection(promise) {
        return promise.catch(error => logger.error("CRON | Send timehop yesterday emails | Error.", {detailedMessage: error}));
    }
};
const _sendTimehop7DaysAgoEmails = async function () {
    const debugDate = null;
    const users = await queries.queryUsersForTimehop7DaysAgo(debugDate);

    const promises = users.map(user => processTimehop7DaysAgo.handleProcess(user, debugDate)).map(handleRejection);
    return Promise.all(promises);

    function handleRejection(promise) {
        return promise.catch(error => logger.error("CRON | Send timehop 7 days ago emails | Error.", {detailedMessage: error}));
    }
};

function deployJobs() {
    if (!config.get('debug:CRON')) {
        cronManager.deployCronJob('sendWeeklyReportEmails', _sendWeeklyReportEmails, {runInDebugMode: false}, '0 0 10 * * SUN', 8 * 60 * 60);
        logger.info("CRON | sendWeeklyReportEmails | Running weekly on Sunday at 10:00PM Europe/Budapest time");
        cronManager.deployCronJob('sendTimehopYesterdayEmails', _sendTimehopYesterdayEmails, {runInDebugMode: false}, '0 0 6 * * *', 8 * 60 * 60);
        logger.info("CRON | sendTimehopYesterdayEmails | Running daily at 6:00AM Europe/Budapest time");
        cronManager.deployCronJob('sendTimehop7DaysAgoEmails', _sendTimehop7DaysAgoEmails, {runInDebugMode: false}, '0 0 7 * * *', 8 * 60 * 60);
        logger.info("CRON | sendTimehop7DaysAgoEmails | Running daily at 7:00AM Europe/Budapest time");
    } else {
        cronManager.deployCronJob('sendWeeklyReportEmails', _sendWeeklyReportEmails, {runInDebugMode: true}, '20,50 * * * * *', 10);
        logger.debug("----- sendWeeklyReportEmails started in debug mode -----");
        cronManager.deployCronJob('sendTimehopYesterdayEmails', _sendTimehopYesterdayEmails, {runInDebugMode: true}, '10,40 * * * * *', 10);
        logger.debug("----- sendTimehopYesterdayEmails started in debug mode -----");
        cronManager.deployCronJob('sendTimehop7DaysAgoEmails', _sendTimehop7DaysAgoEmails, {runInDebugMode: true}, '30,00 * * * * *', 10);
        logger.debug("----- sendTimehop7DaysAgoEmails started in debug mode -----");
    }
}

module.exports = {
    deployJobs
};
