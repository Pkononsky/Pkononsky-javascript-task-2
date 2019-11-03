'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
const isStar = true;

let bankTimeZone;
let notSuitableTimes = new Map([
    ['ПН', []],
    ['ВТ', []],
    ['СР', []],
    ['ЧТ', []]
]);

let nextDay = new Map([
    ['ПН', 'ВТ'],
    ['ВТ', 'СР'],
    ['СР', 'ЧТ']
]);

let days = ['ПН', 'ВТ', 'СР'];
let robDay;
let robTime;
let robSetter;

function convertToBankTimeZone(time) {
    let timeAndZone = time.split('+');
    let zone = timeAndZone[1];
    let newTime = timeAndZone[0].split(':');
    newTime[0] = (parseInt(newTime[0]) + parseInt(bankTimeZone) - parseInt(zone)).toString();

    return newTime.join(':');
}

function convertTime(busyTime) {
    let dayAndTime = busyTime.split(' ');
    let day = dayAndTime[0];
    let time = convertToBankTimeZone(dayAndTime[1]);
    if (time > '23:59') {
        day = nextDay.get(day);
        let hourAndMin = time.split(':');
        hourAndMin[0] = (parseInt(hourAndMin[0]) - 24).toString();
        time = hourAndMin.join(':');
    }

    return [time, day];
}

function determineSuitableTime(busyTime) {
    let timeDayFrom = convertTime(busyTime.from);
    let timeDayTo = convertTime(busyTime.to);
    if (timeDayFrom[1] === timeDayTo[1]) {
        notSuitableTimes.get(timeDayTo[1]).push([timeDayFrom[0], timeDayTo[0]]);
    } else {
        notSuitableTimes.get(timeDayFrom[1]).push([timeDayFrom[0], '23:59']);
        notSuitableTimes.get(timeDayTo[1]).push(['00:00', timeDayTo[0]]);
    }
}

function sortNotSuitableTimes() {
    for (let day of days) {
        notSuitableTimes.get(day).sort();
    }
}

function getNotSuitableTimesForDay(workTimeFrom, workTimeTo, schedule) {
    let scheduleVal = Object.values(schedule);
    for (let busyTimes of scheduleVal) {
        let busyTimeVal = Object.values(busyTimes);
        for (let busyTime of busyTimeVal) {
            determineSuitableTime(busyTime);
        }
    }
    for (let day of days) {
        notSuitableTimes.get(day).push([workTimeFrom, workTimeFrom]);
        notSuitableTimes.get(day).push([workTimeTo, workTimeTo]);
    }
    sortNotSuitableTimes();

    return notSuitableTimes;
}

function getPossibleRobTime(workTimeFrom, workTimeTo, day) {
    let result = [];

    let minStartTime = workTimeFrom;
    for (let busyTime of notSuitableTimes.get(day)) {
        let busyTimeFrom = busyTime[0];
        let busyTimeTo = busyTime[1];
        if (busyTimeFrom >= minStartTime) {
            result.push([minStartTime, busyTimeFrom]);
            minStartTime = busyTimeTo;
        } else if (minStartTime < busyTimeTo) {
            minStartTime = busyTimeTo;
        }
        if (minStartTime >= workTimeTo) {
            break;
        }
    }

    return result;
}

function calculateDuration(start, end) {
    let hStart = parseInt(start[0]);
    let mStart = parseInt(start[1]);
    let hEnd = parseInt(end[0]);
    let mEnd = parseInt(end[1]);

    return (hEnd - hStart) * 60 + (mEnd - mStart);
}

function tryGetAppropriateTime(possibleRobTime, duration) {
    let res = [];
    for (let possTime of possibleRobTime) {
        let start = possTime[0].split(':');
        let end = possTime[1].split(':');

        let actualDuration = calculateDuration(start, end);

        if (duration <= actualDuration) {
            res.push([start, end]);
        }
    }

    return res;
}

function* setNextRobDayAndTime(appropriateTimes, duration) {
    for (let day of appropriateTimes.keys()) {
        let nextRobTimeGen = geat(appropriateTimes, day, duration);
        let res = nextRobTimeGen.next();
        while (res.value) {
            yield res.value;
            res = nextRobTimeGen.next();
        }
    }
    while (1) {
        yield false;
    }
}

function* geat(appropriateTimes, day, duration) {
    for (let time of appropriateTimes.get(day)) {
        robDay = day;
        robTime = time[0];

        let actualDur = calculateDuration(robTime, time[1]);
        let newRobTime = robTime;
        while (actualDur >= duration) {
            robTime = newRobTime;
            yield true;
            newRobTime = getNextRobTime();
            actualDur = calculateDuration(newRobTime, time[1]);
        }
    }
    yield false;
}

function getNextRobTime() {
    let hStart = parseInt(robTime[0]);
    let mStart = parseInt(robTime[1]);
    mStart = mStart + 30;
    hStart = hStart + Math.floor(mStart / 60);
    mStart = mStart % 60;

    return [hStart.toString(), mStart.toString()];
}

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
function getAppropriateMoment(schedule, duration, workingHours) {
    // console.info(schedule, duration, workingHours);
    let workTimeFrom = workingHours.from.split('+')[0];
    let workTimeTo = workingHours.to.split('+')[0];
    bankTimeZone = workingHours.from.split('+')[1];

    getNotSuitableTimesForDay(workTimeFrom, workTimeTo, schedule);
    let timeFound = false;
    let appropriateTimes = new Map();
    for (let day of days) {
        let possibleRobTime = getPossibleRobTime(workTimeFrom, workTimeTo, day);
        let starts = tryGetAppropriateTime(possibleRobTime, duration);
        if (starts.length !== 0) {
            timeFound = true;
            appropriateTimes.set(day, starts);
        }
    }
    robSetter = setNextRobDayAndTime(appropriateTimes, duration);
    robSetter.next();

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return timeFound;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например, "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (!timeFound) {
                return '';
            }
            let answ = template;
            answ = answ.replace('%DD', robDay);
            answ = answ.replace('%HH', robTime[0]);
            answ = answ.replace('%MM', robTime[1]);

            return answ;
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            return robSetter.next().value;
        }
    };
}

module.exports = { getAppropriateMoment, isStar };
