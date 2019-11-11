'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
const isStar = true;

const DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const ROBBERY_DAYS = ['ПН', 'ВТ', 'СР'];
const DECIMAL = 10;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const DAY_START = '00:00';
const DAY_END = '23:59';

function getEmptyBusyData() {
    return new Map(DAYS.map(day => [day, []]));
}

function getTimeAndZone(hours) {
    let [time, timeZone] = hours.split('+');

    return { time, timeZone };
}

function getHoursAndMinutes(time) {
    let [hours, minutes] = time.split(':');

    return { hours, minutes };
}

function getDayInBankZone(day, hoursInBankZone) {
    let skipSize = Math.floor(hoursInBankZone / HOURS_IN_DAY) + DAYS.length;

    return getDayWithSkip(day, skipSize);
}

function getTimeInBankZone(hoursInBankZone, minutes) {
    hoursInBankZone = (hoursInBankZone + HOURS_IN_DAY) % HOURS_IN_DAY;
    hoursInBankZone = getFullTimePart(hoursInBankZone);

    return `${hoursInBankZone}:${minutes}`;
}

function convertToBankTimeZone({ day, timeAndZone, bankTimeZone }) {
    const { time, timeZone } = getTimeAndZone(timeAndZone);
    let { hours, minutes } = getHoursAndMinutes(time);
    let timeZoneDiff = parseInt(bankTimeZone, DECIMAL) - parseInt(timeZone, DECIMAL);
    let hoursInBankZone = parseInt(hours, DECIMAL) + timeZoneDiff;
    let dayInBankZone = getDayInBankZone(day, hoursInBankZone);
    let timeInBankZone = getTimeInBankZone(hoursInBankZone, minutes);

    return { dayInBankZone, timeInBankZone };
}

function getDayWithSkip(day, skipSize) {
    return DAYS[(DAYS.indexOf(day) + skipSize) % DAYS.length];
}

function getBusyData(from, to) {
    let busyData = getEmptyBusyData();
    if (from.dayInBankZone === to.dayInBankZone) {
        busyData.set(from.dayInBankZone, [[from.timeInBankZone, to.timeInBankZone]]);
    } else {
        busyData.set(from.dayInBankZone, [[from.timeInBankZone, DAY_END]]);
        let currentDay = getDayWithSkip(from.dayInBankZone, 1);
        while (currentDay !== to.dayInBankZone) {
            busyData.set(currentDay, [[DAY_START, DAY_END]]);
            currentDay = getDayWithSkip(currentDay, 1);
        }
        busyData.set(to.dayInBankZone, [[DAY_START, to.timeInBankZone]]);
    }

    return busyData;
}

function getDayTimeInBankTimeZone(busyTime, bankTimeZone) {
    let [day, timeAndZone] = busyTime.split(' ');

    return convertToBankTimeZone({ day, timeAndZone, bankTimeZone });
}

function parseSchedule(schedule, bankTimeZone) {
    let scheduleVal = Object.values(schedule);
    let busyData = getEmptyBusyData();
    for (let busyTimes of scheduleVal) {
        let busyTimesVal = Object.values(busyTimes);
        for (let busyTime of busyTimesVal) {
            let dayTimeFrom = getDayTimeInBankTimeZone(busyTime.from, bankTimeZone);
            let dayTimeTo = getDayTimeInBankTimeZone(busyTime.to, bankTimeZone);
            let gaps = getBusyData(dayTimeFrom, dayTimeTo);
            busyData.forEach((value, key) => value.push(...gaps.get(key)));
        }
    }

    return busyData;
}

function getPossibleRobberyTime(busyData, bankWorkFrom, bankWorkTo) {
    let possibleTimes = [];
    let currentTime = bankWorkFrom;
    for (let [timeFrom, timeTo] of [...busyData, [bankWorkTo, bankWorkTo]].sort()) {
        if (currentTime >= timeFrom) {
            currentTime = currentTime < timeTo ? timeTo : currentTime;
        } else {
            possibleTimes.push([currentTime, timeFrom]);
            currentTime = timeTo;
        }
        if (currentTime >= bankWorkTo) {
            break;
        }
    }

    return possibleTimes;
}

function getFullTimePart(timePart) {
    return `0${timePart}`.slice(-2);
}

function addThirtyMinutes(time) {
    let { hours, minutes } = getHoursAndMinutes(time);
    hours = parseInt(hours, DECIMAL);
    minutes = parseInt(minutes, DECIMAL);
    minutes += 30;
    hours += Math.floor(minutes / MINUTES_IN_HOUR);
    hours = getFullTimePart(hours);
    minutes %= MINUTES_IN_HOUR;
    minutes = getFullTimePart(minutes);

    return `${hours}:${minutes}`;
}

function getGapDuration(gapStart, gapEnd) {
    let start = getHoursAndMinutes(gapStart);
    let end = getHoursAndMinutes(gapEnd);
    let [hStart, mStart] = Object.values(start).map(value => parseInt(value, DECIMAL));
    let [hEnd, mEnd] = Object.values(end).map(value => parseInt(value, DECIMAL));

    return (hEnd - hStart) * MINUTES_IN_HOUR + (mEnd - mStart);
}

function tryGetAllAppropriateTime(possibleTimes, duration, day) {
    let robGaps = [];
    for (let [gapStart, gapEnd] of possibleTimes) {
        let dur = getGapDuration(gapStart, gapEnd);
        while (dur >= duration) {
            robGaps.push([day, gapStart]);
            gapStart = addThirtyMinutes(gapStart);
            dur = getGapDuration(gapStart, gapEnd);
        }
    }

    return robGaps;
}

function getAppropriateRobberyTime(busyData, bankWorkFrom, bankWorkTo, duration) {
    let robGaps = [];
    for (let day of ROBBERY_DAYS) {
        let possibleTimes = getPossibleRobberyTime(busyData.get(day), bankWorkFrom, bankWorkTo);
        robGaps = robGaps.concat(tryGetAllAppropriateTime(possibleTimes, duration, day));
    }

    return robGaps;
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
    let bankWorkFrom = getTimeAndZone(workingHours.from);
    let bankWorkTo = getTimeAndZone(workingHours.to);
    let busyData = parseSchedule(schedule, bankWorkFrom.timeZone);
    let robGaps = getAppropriateRobberyTime(busyData, bankWorkFrom.time, bankWorkTo.time, duration);

    let apprTimesEnum = getNextApprTime(robGaps);
    let robDayTime = apprTimesEnum.next().value;

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return robGaps.length !== 0;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например, "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (!robGaps.length) {
                return '';
            }
            let [robDay, robTime] = robDayTime;
            let { hours, minutes } = getHoursAndMinutes(robTime);

            return template
                .replace('%DD', robDay)
                .replace('%HH', hours)
                .replace('%MM', minutes);

        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            let nextRobDayTime = apprTimesEnum.next();
            let isDone = nextRobDayTime.done;
            if (!isDone) {
                robDayTime = nextRobDayTime.value;
            }

            return !isDone;
        }
    };
}

module.exports = { getAppropriateMoment, isStar };
