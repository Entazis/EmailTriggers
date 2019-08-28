/**
 * This file contains the trigger related routes
 */
/* ---------- Module requirements */
const express = require('express');
const i18n = require('i18n');
const i18nHelper = require('../i18n/i18n');
const User = require('../user/user');
const curriculumRepository = require('../curriculum-repository/repository');

/* ---------- JSDOC definitions */
/* ---------- Module functions */
const urlRoot = "/triggers";
const urls = {
    urlRoot,
    urlTest: urlRoot + '/test'
};
const oneDay = 60*60*24*1000;
const oneWeek = 60*60*24*1000*7;

/**
 * @param request
 * @param response
 */
const handleTestPageGet = function(request, response) {
    return response.render('./triggers/test-screen');
};

/**
 * @param request
 * @param response
 */
const handleTestPagePost = async function(request, response) {
    const endDate = new Date((request.body.date) ? request.body.date : 0);
    const email = request.body.email;
    const type = request.body.type;
    let completedAssignmentCount = 0;
    let completedAssignments = [];
    let viewedUser = {};
    let nextProjectAssignmentDescriptor = {};

    if (email && !isNaN(endDate.getTime())) {
        viewedUser = await User.findOne({"personalData.email": email});
        const submissions = viewedUser.submissions;
        const startDate = new Date(endDate.getTime() - ((type === 'weekly-report') ? oneWeek : oneDay));

        for (const lessonHash in submissions) {
            if (submissions.hasOwnProperty(lessonHash)) {
                const projectLesson = curriculumRepository.getProjectLessonByHash(lessonHash, viewedUser.getFullLocaleCodeOrDefault()).toObject();

                for (let assignmentName in submissions[lessonHash]) {
                    if (submissions[lessonHash].hasOwnProperty(assignmentName)){
                        const assignmentSubmissions = submissions[lessonHash][assignmentName].filter(submission => {
                            return startDate <= submission.created_at && submission.created_at <= endDate;
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

      const nextProjectLesson = curriculumRepository.getProjectLessonByHash(viewedUser.projectProgress.latest.lessonHash, viewedUser.getFullLocaleCodeOrDefault()).toObject();
      nextProjectAssignmentDescriptor = nextProjectLesson.assignments[viewedUser.projectProgress.latest.assignmentIndex];
    }

    return response.render('./triggers/test-screen',
        {viewedUser: viewedUser, type: type, completedAssignmentCount: completedAssignmentCount, completedAssignments: completedAssignments,
          date: (endDate.toISOString().substr(0,10)), nextAssignment: nextProjectAssignmentDescriptor.title});
};

/* ---------- Module body */
const router = new express.Router({});

/* Init i18n to be accessible by the templating engine
 * Add middleware to enforce user locale change */
router.use(i18n.init);
router.use(function(request, response, next) {
    i18nHelper.determineLocale(request, response);
    next();
});

/* Routes */
router.get(urls.urlTest, handleTestPageGet);
router.post(urls.urlTest, handleTestPagePost);

/* ---------- Module exports */
module.exports = router;