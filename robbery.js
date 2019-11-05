'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
const isStar = true;

const days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

function getEmptyBusyData() {
    return new Map([
        ['ПН', []],
        ['ВТ', []],
        ['СР', []],
        ['ЧТ', []],
        ['ПТ', []],
        ['СБ', []],
        ['ВС', []]
    ]);
}

function parseHours(hours) {
    let plusIndex = hours.indexOf('+');
    let time = hours.slice(0, plusIndex);
    let timeZone = hours.slice(plusIndex + 1);

    return [time, timeZone];
}

function convertToBankTimeZone(dayAndTime, bankTimeZone) {
    let timeAndZone = parseHours(dayAndTime[1]);
    let separatorIndex = timeAndZone[0].indexOf(':');
    let hours = timeAndZone[0].slice(0, separatorIndex);
    let minutes = timeAndZone[0].slice(separatorIndex + 1);
    let trueHours = parseInt(hours) + parseInt(bankTimeZone) - parseInt(timeAndZone[1]);

    let trueDay = days[(days.indexOf(dayAndTime[0]) + Math.floor(trueHours / 24)) % days.length];
    let trueTime = trueHours + ':' + minutes;

    return [trueDay, trueTime];
}

function addGap(dayTimeFrom, dayTimeTo, result) {
    if (dayTimeFrom[0] === dayTimeTo[0]) {
        result.get(dayTimeFrom[0]).push([dayTimeFrom[1], dayTimeTo[1]]);
    } else {
        result.get(dayTimeFrom[0]).push([dayTimeFrom[1], '23:59']);
        let currentDay = days[(days.indexOf(dayTimeFrom[0]) + 1) % days.length];
        while (currentDay !== dayTimeTo[0]) {
            result.get(currentDay).push(['00:00', '23:59']);
            currentDay = days[(days.indexOf(currentDay) + 1) % days.length];
        }
        result.get(dayTimeTo[0]).push(['00:00', dayTimeTo[1]]);
    }
}

function parseSchedule(schedule, bankTimeZone) {
    let scheduleVal = Object.values(schedule);
    let result = getEmptyBusyData();
    for (let busyTimes of scheduleVal) {
        let busyTimesVal = Object.values(busyTimes);
        for (let busyTime of busyTimesVal) {
            let dayTimeFrom = convertToBankTimeZone(busyTime.from.split(' '), bankTimeZone);
            let dayTimeTo = convertToBankTimeZone(busyTime.to.split(' '), bankTimeZone);
            addGap(dayTimeFrom, dayTimeTo, result);
        }
    }

    return result;
}

function getPossibleRobberyTime(busyData, bankWorkFrom, bankWorkTo, day) {
    let result = [];
    busyData.get(day).push([bankWorkTo, bankWorkTo]);
    busyData.get(day).sort();
    let currentTime = bankWorkFrom;
    for (let busyTime of busyData.get(day)) {
        let timeFrom = busyTime[0];
        let timeTo = busyTime[1];
        if (currentTime >= timeFrom) {
            currentTime = currentTime < timeTo ? timeTo : currentTime;
        } else {
            result.push([currentTime, timeFrom]);
            currentTime = timeTo;
        }
        if (currentTime >= bankWorkTo) {
            break;
        }
    }

    return result;
}

function addThirtyMinutes(time) {
    let sepIndex = time.indexOf(':');
    let hour = parseInt(time.slice(0, sepIndex));
    let minute = parseInt(time.slice(sepIndex + 1));
    minute += 30;
    hour += Math.floor(minute / 60);
    minute %= 60;

    return hour + ':' + minute;
}

function getDuration(time) {
    let start = time[0].split(':');
    let end = time[1].split(':');
    let hStart = parseInt(start[0]);
    let mStart = parseInt(start[1]);
    let hEnd = parseInt(end[0]);
    let mEnd = parseInt(end[1]);

    return (hEnd - hStart) * 60 + (mEnd - mStart);
}

function tryGetAllAppropriateTime(possibleTimes, duration, result, day) {
    for (let possibleTime of possibleTimes) {
        let currentTime = possibleTime;
        let dur = getDuration(currentTime);
        while (dur >= duration) {
            result.push([day, currentTime[0]]);
            currentTime[0] = addThirtyMinutes(currentTime[0]);
            dur = getDuration(currentTime);
        }
    }
}

function getAppropriateRobberyTime(busyData, bankWorkFrom, bankWorkTo, duration) {
    let result = [];
    for (let day of ['ПН', 'ВТ', 'СР']) {
        let possibleTimes = getPossibleRobberyTime(busyData, bankWorkFrom, bankWorkTo, day);
        tryGetAllAppropriateTime(possibleTimes, duration, result, day);
    }

    return result;
}

function* getNextApprTime(apprTimes) {
    for (let apprTime of apprTimes) {
        yield apprTime;
    }
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
    let bankWorkFrom = parseHours(workingHours.from);
    let bankWorkTo = parseHours(workingHours.to);
    let busyData = parseSchedule(schedule, bankWorkFrom[1]);
    let apprTimes = getAppropriateRobberyTime(busyData, bankWorkFrom[0], bankWorkTo[0], duration);

    let apprTimesEnum = getNextApprTime(apprTimes);
    let robDayTime = apprTimesEnum.next().value;

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return apprTimes.length !== 0;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например, "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (apprTimes.length === 0) {
                return '';
            }
            let answ = template;
            answ = answ.replace('%DD', robDayTime[0]);
            let robTime = robDayTime[1].split(':');
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
            let nextRobDayTime = apprTimesEnum.next();
            if (!nextRobDayTime.done) {
                robDayTime = nextRobDayTime.value;
            }

            return !nextRobDayTime.done;
        }
    };
}

module.exports = { getAppropriateMoment, isStar };
