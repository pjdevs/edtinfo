const http = require('http');

const name = 'CP400';
const group = 'MP';

function getUrl(type, param='') {
    if (type == 'day') {
        if (param == '') return `http://hackjack.info/et/json.php?type=${type}&name=${name}&group=${group}`;
        else return `http://hackjack.info/et/json.php?type=${type}&name=${name}&group=${group}&date=${param}`;
    }
    else if (type == 'week') {
        if (param == '') return `http://hackjack.info/et/json.php?type=${type}&name=${name}&group=${group}`;
        else return `http://hackjack.info/et/json.php?type=${type}&name=${name}&group=${group}&week=${param}`;
    }
    else throw new Error('Wrong type argument');
}

function getTime() {
    let date = new Date();
    return date.getHours()*60 + date.getMinutes();
}

function getDateIn(d=0) {
    let date = new Date();
    date.setDate(date.getDate()+d);

    let day = date.getDate().toString();
    let month = (date.getMonth() + 1).toString();
    let year = date.getFullYear().toString();

    if (month.length == 1) month = '0' + month;
    if (day.length == 1) day = '0' + day;

    return `${year}/${month}/${day}`;
}

function getDateFromDate(date) {
    let day = date.getDate().toString();
    let month = (date.getMonth() + 1).toString();
    let year = date.getFullYear().toString();

    if (month.length == 1) month = '0' + month;
    if (day.length == 1) day = '0' + day;

    return `${year}/${month}/${day}`;
}

function getCourseList(type, param='') {
    return new Promise(resolve => {
        let data = '';

        http.get(getUrl(type, param), res => {
            res.on('error', err => {
                throw err;
            });

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (err) {
                    throw err;
                }
            });
        });
    });
}

function getName(course) {
    let name = course.subject.split(' ');
    name.shift();
    
    name = name.filter(e => e != 'MP' && e != 'MPC' && e != '4');

    return name.join(' ');
}

function getStartTimeMinutes(course) {
    let time = course.starttime.split(':');

    return parseInt(time[0])*60 + parseInt(time[1]);
}

function getPrettyStart(course) {
    let time = course.starttime.split(':');

    if (time[0][0] == '0') time[0] = time[0][1];

    if (time[1] == '00') return time[0] + ' heures';
    else return time[0] + ' heures ' + time[1];
}

function getPrettyEnd(course) {
    let time = course.endtime.split(':');

    if (time[0][0] == '0') time[0] = time[0][1];

    if (time[1] == '00') return time[0] + ' heures';
    else return time[0] + ' heures ' + time[1];
}

async function getNextCourse() {
    let course = undefined;
    let today = await getCourseList('day', getDateIn());
    
    if (today.length != 0) {
        let less = 24*60;
        let time = getTime();

        today.forEach(c => {
            let start = getStartTimeMinutes(c);
            if (start >= time && start < less) {
                less = start;
                course = c;
            }
        });
    }

    let time = '';

    if (course == undefined) {
        let tomorrow = [];
        let i = 0;

        do {
            tomorrow = await getCourseList('day', getDateIn(i+1));
            i++;
        } while (tomorrow.length == 0)

        course = tomorrow[0];
        
        if (i == 1) time = ' demain à ';
        else if (i == 2) time = ' après demain à ';
        else time = ` dans ${i} jours à `;
    }


    if (time == '') {
        return {
            name: getName(course),
            start: ' à ' + getPrettyStart(course)
        };
    }
    else {
        return {
            name: getName(course),
            start: time + getPrettyStart(course)
        };
    }
}

async function getEndTime(date) {
    let course = undefined;
    let today = await getCourseList('day', getDateFromDate(date));
    
    if (today.length != 0) {
        course = today[today.length-1];

        return {
            name: getName(course),
            end: getPrettyEnd(course)
        }
    }

    return course;
}

exports.getNextCourse = getNextCourse;
exports.getEndTime = getEndTime;