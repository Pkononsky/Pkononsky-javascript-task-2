'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
const isStar = true;

const DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const ROBBERYDAYS = ['ПН', 'ВТ', 'СР'];
const DECIMAL = 10;
const HOURSINDAY = 24;
const MINUTESINHOUR = 60;
const DAYSTART = '00:00';
const DAYEND = '23:59';

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
    let skipSize = Math.floor(hoursInBankZone / HOURSINDAY) + DAYS.length;

    return getDayWithSkip(day, skipSize);
}

function getTimeInBankZone(hoursInBankZone, minutes) {
    hoursInBankZone = (hoursInBankZone + HOURSINDAY) % HOURSINDAY;
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
    let result = getEmptyBusyData();
    if (from.dayInBankZone === to.dayInBankZone) {
        result.set(from.dayInBankZone, [[from.timeInBankZone, to.timeInBankZone]]);
    } else {
        result.set(from.dayInBankZone, [[from.timeInBankZone, DAYEND]]);
        let currentDay = getDayWithSkip(from.dayInBankZone, 1);
        while (currentDay !== to.dayInBankZone) {
            result.set(currentDay, [[DAYSTART, DAYEND]]);
            currentDay = getDayWithSkip(currentDay, 1);
        }
        result.set(to.dayInBankZone, [[DAYSTART, to.timeInBankZone]]);
    }

    return result;
}

function parseSchedule(schedule, bankTimeZone) {
    let scheduleVal = Object.values(schedule);
    let result = getEmptyBusyData();
    for (let busyTimes of scheduleVal) {
        let busyTimesVal = Object.values(busyTimes);
        for (let busyTime of busyTimesVal) {
            let [day, timeAndZone] = busyTime.from.split(' ');
            let dayTimeFrom = convertToBankTimeZone({ day, timeAndZone, bankTimeZone });
            [day, timeAndZone] = busyTime.to.split(' ');
            let dayTimeTo = convertToBankTimeZone({ day, timeAndZone, bankTimeZone });
            let gaps = getBusyData(dayTimeFrom, dayTimeTo);
            result.forEach((value, key) => value.push(...gaps.get(key)));
        }
    }

    return result;
}

function getPossibleRobberyTime(busyData, bankWorkFrom, bankWorkTo) {
    let result = [];
    let currentTime = bankWorkFrom;
    for (let [timeFrom, timeTo] of [...busyData, [bankWorkTo, bankWorkTo]].sort()) {
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

function getFullTimePart(timePart) {
    return `0${timePart}`.slice(-2);
}

function addThirtyMinutes(time) {
    let { hours, minutes } = getHoursAndMinutes(time);
    hours = parseInt(hours, DECIMAL);
    minutes = parseInt(minutes, DECIMAL);
    minutes += 30;
    hours += Math.floor(minutes / MINUTESINHOUR);
    hours = getFullTimePart(hours);
    minutes %= MINUTESINHOUR;
    minutes = getFullTimePart(minutes);

    return `${hours}:${minutes}`;
}

function getGapDuration(gapStart, gapEnd) {
    let start = getHoursAndMinutes(gapStart);
    let end = getHoursAndMinutes(gapEnd);
    let [hStart, mStart] = Object.values(start).map(value => parseInt(value, DECIMAL));
    let [hEnd, mEnd] = Object.values(end).map(value => parseInt(value, DECIMAL));

    return (hEnd - hStart) * MINUTESINHOUR + (mEnd - mStart);
}

function tryGetAllAppropriateTime(possibleTimes, duration, day) {
    let result = [];
    for (let [gapStart, gapEnd] of possibleTimes) {
        let dur = getGapDuration(gapStart, gapEnd);
        while (dur >= duration) {
            result.push([day, gapStart]);
            gapStart = addThirtyMinutes(gapStart);
            dur = getGapDuration(gapStart, gapEnd);
        }
    }

    return result;
}

function getAppropriateRobberyTime(busyData, bankWorkFrom, bankWorkTo, duration) {
    let result = [];
    for (let day of ROBBERYDAYS) {
        let possibleTimes = getPossibleRobberyTime(busyData.get(day), bankWorkFrom, bankWorkTo);
        result = result.concat(tryGetAllAppropriateTime(possibleTimes, duration, day));
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
            if (robGaps.length === 0) {
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
