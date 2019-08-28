/**
 * This file handles the weekly report email for user process
 */
/* ---------- Module requirements */
const config = require('@codeberry/nodejs').config;
const SesEmailSenderWithMauticTemplate = require('@codeberry/nodejs').emailing.SesEmailSenderWithMauticTemplate;
const translatorDouble = {__: () => {}};
const badges = require('../badge/badgeRepository');

/* i18n global config */
const i18n = require('i18n');
const i18nHelper = require('../i18n/i18n');
const curriculumRepository = require('../curriculum-repository/repository');

const oneWeek = 60*60*24*1000*7;

/**
 * @param {User} user The user data object
 * @param {string|null} debugDate
 * @return {Promise.<statusMessageCallback>} result The status messages
 */
const handleProcess = async function(user, debugDate) {
    const submissions = user.submissions;
    const now = (debugDate) ? new Date(debugDate) : new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startDate = new Date(endDate.getTime() - oneWeek);
    let completedAssignmentCount = 0;
    let completedAssignments = [];
    let unlockedBadges = [];

    for (const lessonHash in submissions) {
        if (submissions.hasOwnProperty(lessonHash)) {
            const projectLesson = curriculumRepository.getProjectLessonByHash(lessonHash, user.getFullLocaleCodeOrDefault());

            for (let assignmentName in submissions[lessonHash]) {
                if (submissions[lessonHash].hasOwnProperty(assignmentName)){
                    const assignmentSubmissions = submissions[lessonHash][assignmentName].filter(submission => {
                        return startDate <= submission.created_at && submission.created_at < endDate;
                    });
                    if (assignmentSubmissions.length) {
                        const projectAssignmentDescriptor = projectLesson.assignments.find(assignment => {
                            return assignment.name === assignmentName;
                        });
                        completedAssignmentCount += 1;
                        completedAssignments.push({lesson: projectLesson.title, assignment: projectAssignmentDescriptor.title});
                    }
                }
            }
        }
    }
    const levelProgress = user.levelProgress.toObject();
    for (const condition in levelProgress) {
        if (levelProgress.hasOwnProperty(condition) && startDate <= levelProgress[condition] && levelProgress[condition] < endDate){
            const allBadges = badges.getAllLocalizedBadges(user.getFullLocaleCodeOrDefault());
            const allAvailableBadges = allBadges.filter(badge => badge.isAvailable);
            unlockedBadges.push(allAvailableBadges.find(badge => badge.condition === condition));
        }
    }

    const nextProjectLesson = curriculumRepository.getProjectLessonByHash(user.projectProgress.latest.lessonHash, user.getFullLocaleCodeOrDefault());
    const nextAssignmentTitle = nextProjectLesson.assignments[user.projectProgress.latest.assignmentIndex].title;

    /* Set locale for the email */
    const locale = (user.locale || {}).fullLocaleCode || i18nHelper.i18nConfigGlobal.defaultLocale;

    /* Compose weekly report email */
    const email = user.personalData.email || '';

    const dateStringOptions = { month: 'long', day: 'numeric' };
    const startDateFormatted = startDate.toLocaleDateString(user.locale.fullLocaleCode, dateStringOptions);
    const endDateFormatted = endDate.toLocaleDateString(user.locale.fullLocaleCode, dateStringOptions);

    /* Build email message */
    const subject = i18n.__({phrase: "Your Activity Report: %s - %s", locale: locale}, startDateFormatted, endDateFormatted);
    let body = '';

    if (completedAssignmentCount === 1) {
        body += i18n.__({phrase: "Hey %s!<br><p>You've completed the \"%s\" assignment last week.</p>", locale: locale}, user.personalData.givenName, completedAssignments[0].assignment);
    } else if (completedAssignmentCount > 1) {
        body += i18n.__({phrase: "Hey %s!<br><h4>You've completed %s assignments last week.</h4>", locale: locale}, user.personalData.givenName, completedAssignmentCount);
        body += i18n.__({phrase: "<p>You have finished the following assignments:</p>", locale: locale});
        for (const completed of completedAssignments) {
            const assignmentTitle = i18n.__({phrase: completed.assignment, locale: locale});
            body += `<li>${assignmentTitle}</li>`;
        }
        body += i18n.__({phrase: "<p>Congratulations on that!</p>", locale: locale});
    } else {
        throw 'No completed assignment for the given date range';
    }


    if (unlockedBadges.length === 1) {
        body += i18n.__({phrase: "<p>You have unlocked the following badge: %s</p>", locale: locale}, unlockedBadges[0].name);
        body += '<div style="display:block;text-align:center">';
        body += `<img src="${config.get("app:BASE_URL")}${unlockedBadges[0].image}" alt="badge" style="width:120px;height:120px;">`;
        body += '</div>';
        body += i18n.__({phrase: "<p>Check all of your unlocked badges <a href='/user/profile/#badges'>here</a></p>", locale: locale}, unlockedBadges[0].name);
    } else if (unlockedBadges.length > 1) {
        body += i18n.__({phrase: "<h4>You have unlocked the following badges:</h4>", locale: locale}, unlockedBadges.length);
        body += '<ul>';
        for (const unlockedBadge of unlockedBadges) {
            const badgeName = i18n.__({phrase: unlockedBadge.name, locale: locale});
            body += `<li style="text-align: center;">${badgeName}</li>`;
        }
        body += '</ul>';
        body += '<div style="display: inline-block; text-align: center">';
        for (const unlockedBadge of unlockedBadges) {
            body += '<div style="display: inline-block; width: 25%">';
            body += `<img src="${config.get("app:BASE_URL")}${unlockedBadge.image}" alt="badge">`;
            body += '</div>';
        }
        body += '</div>';
    }

    body += i18n.__({phrase: "<p>Congratulations!</p><br>", locale: locale});
    body += i18n.__({phrase: "<p>The next assignment is: ", locale: locale});
    body += `<a href="${config.get("app:BASE_URL")}/lessons" target="_blank" class="btn btn-primary">${nextAssignmentTitle}</a></p><br><br>`;

    /* Send email */
    try {
        const sesEmailSenderWithMauticTemplate = new SesEmailSenderWithMauticTemplate({
            translator: translatorDouble,
            awsSesAccessKeyId: config.get("amazon-ses:ACCESS_KEY_ID"),
            awsSesSecretAccessKey: config.get("amazon-ses:ACCESS_KEY_SECRET"),
            awsSesRegion: config.get("amazon-ses:REGION"),
            awsSesMaximumEmailsPerSecond: config.get("amazon-ses:THROTTLING_MAXIMUM_EMAILS_PER_SECOND")
        });
        await sesEmailSenderWithMauticTemplate.sendEmailWithTemplateAsAgent(email, subject, body, user.getFullLocaleCodeOrDefault(), '');
    } catch (e) {
        throw e;
    }
};

/* ---------- Module exports */
module.exports = {
    handleProcess: handleProcess
};