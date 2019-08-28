/**
 * This file contain queries for the ORANGE database
 */
/* ---------- Module requirements */
const User = require('../user/user');

/* Logger */
const logger = require('@codeberry/nodejs').logger;
/* ---------- JSDOC definitions */
/* ---------- Module functions */

const oneDay = 60*60*24*1000;
const oneWeek = 60*60*24*1000*7;

const _getUsersWithAtLeastOneSubmission = async function (users, startDate, endDate) {
  let usersWhoMadeSubmission = [];

  for (const user of users) {
    const submissions = user.submissions;
    for (const lesson in submissions) {
      if (submissions.hasOwnProperty(lesson)){

        for (const assignment in submissions[lesson]) {
          if (submissions[lesson].hasOwnProperty(assignment)){

            for (const submission of submissions[lesson][assignment]) {
              if (startDate <= submission.created_at && submission.created_at < endDate) {
                usersWhoMadeSubmission.push(user);
                break;
              }
            }
            break;
          }
        }
        break;

      }
    }
  }

  return usersWhoMadeSubmission;
};

const _getUsersWithZeroSubmission = async function (users, startDate, endDate) {
    let usersWhoMadeZeroSubmission = [];
    let submissionCnt = 0;

    for (const user of users) {
        const submissions = user.submissions;
        for (const lesson in submissions) {
            if (submissions.hasOwnProperty(lesson)){

                for (const assignment in submissions[lesson]) {
                    if (submissions[lesson].hasOwnProperty(assignment)){

                        for (const submission of submissions[lesson][assignment]) {
                            if (startDate <= submission.created_at && submission.created_at < endDate) {
                                submissionCnt += 1;
                                break;
                            }
                        }
                        break;
                    }
                }
                break;

            }
        }
        if (submissionCnt === 0) {
            usersWhoMadeZeroSubmission.push(user);
        }
        submissionCnt = 0;
    }

    return usersWhoMadeZeroSubmission;
};

const queryUsersForWeeklyReport = async function(debugDate) {
    try {
        const users = await User.find();
        const now = (debugDate) ? new Date(debugDate) : new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const startDate = new Date(endDate.getTime() - oneWeek);
        return await _getUsersWithAtLeastOneSubmission(users, startDate, endDate);

    } catch (e) {
        const logMessage = 'QUERY | queryUsersForWeeklyReport | Query error';
        logger.error(logMessage, {
            detailedMessage: e.message + ' ' + e.stack,
        });
        return [];
    }
};

const queryUsersForTimehopYesterday = async function(debugDate) {
    try {
      const users = await User.find();
      const now = (debugDate) ? new Date(debugDate) : new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const startDate = new Date(endDate.getTime() - oneDay);
      return await _getUsersWithAtLeastOneSubmission(users, startDate, endDate);

    } catch (e) {
        const logMessage = 'QUERY | queryUsersForTimehopYesterday | Query error';
        logger.error(logMessage, {
            detailedMessage: e.message + ' ' + e.stack,
        });
        return [];
    }
};

const queryUsersForTimehop7DaysAgo = async function(debugDate) {
    try {
        const users = await User.find();
        const now = (debugDate) ? new Date(debugDate) : new Date();
        let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        let startDate = new Date(endDate.getTime() - oneWeek + oneDay);
        const usersWithZeroSubmissionLastWeek = await _getUsersWithZeroSubmission(users, startDate, endDate);
        endDate = startDate;
        startDate = new Date(endDate.getTime() - oneDay);
        return await _getUsersWithAtLeastOneSubmission(usersWithZeroSubmissionLastWeek, startDate, endDate);

    } catch (e) {
        const logMessage = 'QUERY | queryUsersForTimehopYesterday | Query error';
        logger.error(logMessage, {
            detailedMessage: e.message + ' ' + e.stack,
        });
        return [];
    }
};

/* ---------- Module exports */
module.exports = {
    queryUsersForWeeklyReport,
    queryUsersForTimehopYesterday,
    queryUsersForTimehop7DaysAgo
};