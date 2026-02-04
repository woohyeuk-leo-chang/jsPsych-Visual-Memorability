var debug = false;

var jsPsych = initJsPsych();
var timeline = [];

if (!debug) {
    // let pid = jsPsych.data.getURLVariable('PROLIFIC_PID');
    jsPsych.data.addProperties({
        list_id: 48
    });

    var pavlovia_init = {
        type: jsPsychPavlovia,
        command: "init"
    };

    var pavlovia_finish = {
        type: jsPsychPavlovia,
        command: 'finish',
    };
}

/* Generate shuffled study and test lists */
function generateStudyTestLists(old_images, new_images) {
    function shuffle(array) {
        let a = array.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    const shuffledOld = shuffle(old_images);
    const shuffledNew = shuffle(new_images);

    const lists = {};

    for (let block = 1; block <= 3; block++) {
        const study_start = (block - 1) * 100;
        const study_images = shuffledOld.slice(study_start, study_start + 100);
        const test_new_images = shuffledNew.slice(study_start, study_start + 100);

        const study_list = study_images.map((img, i) => ({
            block: block,
            phase: 'study',
            trial: i + 1,
            stimulus: img,
            stim_type: "old",
            correct_response: ''
        }));

        const test_list = shuffle(
            study_images.map(img => ({
                stimulus: img,
                stim_type: "old",
                correct_response: 'f',
                block: block,
                phase: 'test',
            })).concat(
                test_new_images.map(img => ({
                    stimulus: img,
                    stim_type: "new",
                    correct_response: 'j',
                    block: block,
                    phase: 'test',
                }))
            )
        ).map((t, i) => ({
            ...t,
            trial: i + 1
        }));

        lists[`study_list_block${block}`] = study_list;
        lists[`test_list_block${block}`] = test_list;
    }

    return lists;
}

const allLists = generateStudyTestLists(old_images, new_images);
console.log(allLists);

var preload = {
    type: jsPsychPreload,
    images:  [
        ...old_images,
        ...new_images,
        ...practice_images
    ]
};

var prolific_id_enter = {
    type: jsPsychSurveyText,
    preamble: '<h3>Welcome!</h3>',
    questions: [{prompt: 'Please enter your Prolific ID:', required: true, name: 'prolific_id'}]
};

var welcome = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "Welcome to the experiment. Press any key to begin."
};

var instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
    <p>In this experiment, you will be studying total of 300 images, divided into 3 blocks.</p>
    <p>After studying 100 images for each block, you will be tested on your memory for those images.</p> 
    <p>You will respond whether you have seen an image during your study phase or not.</p>
    <p><b>Your submission will not be accepted if you score lower than 55% accuracy in any of the blocks.</b></p>
    <p>We will start with short practice trials.</p>
    <p>Press any key to begin.</p>
    `,
    post_trial_gap: 500
};

var practice_end = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
    <p>This is the end of the practice.</p>
    <p>Press any key to begin the actual experiment.</p>
    `,
    post_trial_gap: 500
};

var study_instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
    <p><b>Study Phase</b></p>
    <p>You will be seeing images in sequence. Pay close attention!</p>
    <p>Press any key to begin.</p>
    `,
    post_trial_gap: 500
};

var fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div style="font-size:60px;">+</div>',
    choices: "q",
    trial_duration: 500
};

var study = {
    type: jsPsychImageKeyboardResponse,
    stimulus: jsPsych.timelineVariable('stimulus'),
    choices: "q",
    prompt: "",
    trial_duration: 1000,
    data: {
        block: jsPsych.timelineVariable('block'),
        phase: jsPsych.timelineVariable('phase'),
        trial: jsPsych.timelineVariable('trial'),
        stimulus: jsPsych.timelineVariable('stimulus'),
        stim_type: jsPsych.timelineVariable('stim_type')
    },
};

var test_instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
    <p><b>Test Phase</b></p>
    <p>Now, you will respond whether you saw the image in the previously studied list or not.</p>
    <p>Press any key to begin.</p>
    `,
    post_trial_gap: 500
};

var test = {
    type: jsPsychImageKeyboardResponse,
    stimulus: jsPsych.timelineVariable('stimulus'),
    choices: ['f', 'j'],
    prompt: "<p>Press 'f' for old and 'j' for new</p>",
    trial_duration: 4000,
    data: {
        block: jsPsych.timelineVariable('block'),
        phase: jsPsych.timelineVariable('phase'),
        trial: jsPsych.timelineVariable('trial'),
        stimulus: jsPsych.timelineVariable('stimulus'),
        stim_type: jsPsych.timelineVariable('stim_type'),
        correct_response: jsPsych.timelineVariable('correct_response'),
    },
    on_finish: function(data) {
        data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
    }
};

var feedback = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
        const last_trial_correct = jsPsych.data.get().last(1).values()[0].correct;
        return last_trial_correct 
        ? "<p style='color:green; font-size: 40px;'>CORRECT</p>"
        : "<p style='color:red; font-size: 40px;'>INCORRECT</p>";
    },
    choices: "NO_KEYS",
    trial_duration: 400
};

function blockEndMessage(blockNum) {
    return {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function() {
        const block_data = jsPsych.data.get().filter({block: blockNum, phase: 'test'});
        const total = block_data.count();
        const correct = block_data.filter({correct: true}).count();
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        return `<p>You completed Block ${blockNum}/3.</p>
                <p>Your accuracy for this block was <b>${accuracy}%</b>.</p>
                <p>Press any key to continue.</p>`;
    },
      post_trial_gap: 500
    };
}

var end = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "<p>This is the end of the experiment. Thank you for participating!</p>" + 
    "<p><a href='https://app.prolific.com/submissions/complete?cc=C3LB27OD'>Click here</a> to return to Prolific.</p>", 
    choices: "NO_KEYS",
};

/* Experiment Sequence */
if (!debug) {
    timeline.push(pavlovia_init);
};
timeline.push(prolific_id_enter);
timeline.push(preload);
timeline.push(welcome);
timeline.push(instructions);

/* Practice */
timeline.push(study_instructions);
timeline.push({
    timeline: [fixation, study],
    timeline_variables: practice_study_list
});
timeline.push(test_instructions)
timeline.push({
    timeline: [test, feedback],
    timeline_variables: practice_test_list
});
timeline.push(practice_end);

/* Actual Experiment */
for (var block = 1; block <= 3; block++) {
    timeline.push(study_instructions);
    timeline.push({
    timeline: [fixation, study],
    timeline_variables: allLists['study_list_block' + block]
    });
    timeline.push(test_instructions);
    timeline.push({
    timeline: [test, feedback],
    timeline_variables: allLists['test_list_block' + block]
    });
    timeline.push(blockEndMessage(block));
};

if (!debug) {
    timeline.push(pavlovia_finish);
};
timeline.push(end);

jsPsych.run(timeline);  
