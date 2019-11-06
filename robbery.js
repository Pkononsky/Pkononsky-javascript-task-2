'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
const isStar = true;

const days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const robberyDay = ['ПН', 'ВТ', 'СР'];
const decimal = 10;
const hoursInDay = 24;
const minutesInHour = 60;
const dayStart = '00:00';
const dayEnd = '23:59';

function getEmptyBusyData() {
    return new Map(days.map(day => [day, []]));
}

function getTimeAndZone(hours) {
    let [time, timeZone] = hours.split('+');

    return { time, timeZone };
}

function convertToBankTimeZone({ day, timeAndZone, bankTimeZone }) {
    const { time, timeZone } = getTimeAndZone(timeAndZone);
    let [hours, minutes] = time.split(':');
    let timeZoneDiff = parseInt(bankTimeZone, decimal) - parseInt(timeZone, decimal);
    let hoursInBankZone = parseInt(hours, decimal) + timeZoneDiff;
    let nextDayIndex = days.indexOf(day) + Math.floor(hoursInBankZone / hoursInDay) + days.length;
    let dayInBankZone = days[nextDayIndex % days.length];
    hoursInBankZone = (hoursInBankZone + hoursInDay) % hoursInDay;
    hoursInBankZone = getFullTimePart(hoursInBankZone);
    let timeInBankZone = `${hoursInBankZone}:${minutes}`;

    return [dayInBankZone, timeInBankZone];
}

function getGaps(dayTimeFrom, dayTimeTo) {
    let result = getEmptyBusyData();
    if (dayTimeFrom[0] === dayTimeTo[0]) {
        result.set(dayTimeFrom[0], [[dayTimeFrom[1], dayTimeTo[1]]]);
    } else {
        result.set(dayTimeFrom[0], [[dayTimeFrom[1], dayEnd]]);
        let currentDay = days[(days.indexOf(dayTimeFrom[0]) + 1) % days.length];
        while (currentDay !== dayTimeTo[0]) {
            result.set(currentDay, [[dayStart, dayEnd]]);
            currentDay = days[(days.indexOf(currentDay) + 1) % days.length];
        }
        result.set(dayTimeTo[0], [[dayStart, dayTimeTo[1]]]);
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
            let gaps = getGaps(dayTimeFrom, dayTimeTo);
            result.forEach((value, key) => value.push(...gaps.get(key)));
        }
    }

    return result;
}

function getPossibleRobberyTime(busyData, bankWorkFrom, bankWorkTo) {
    let result = [];
    busyData.push([bankWorkTo, bankWorkTo]);
    busyData.sort();
    let currentTime = bankWorkFrom;
    for (let busyTime of busyData) {
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

function getFullTimePart(timePart) {
    return Math.floor(timePart / 10) === 0 ? '0' + timePart : timePart;
}

function addThirtyMinutes(time) {
    let [hour, minute] = time.split(':');
    hour = parseInt(hour, decimal);
    minute = parseInt(minute, decimal);
    minute += 30;
    hour += Math.floor(minute / minutesInHour);
    hour = getFullTimePart(hour);
    minute %= minutesInHour;
    minute = getFullTimePart(minute);

    return `${hour}:${minute}`;
}

function getDuration(time) {
    let start = time[0].split(':');
    let end = time[1].split(':');
    let hStart = parseInt(start[0], decimal);
    let mStart = parseInt(start[1], decimal);
    let hEnd = parseInt(end[0], decimal);
    let mEnd = parseInt(end[1], decimal);

    return (hEnd - hStart) * minutesInHour + (mEnd - mStart);
}

function tryGetAllAppropriateTime(possibleTimes, duration, day) {
    let result = [];
    for (let possibleTime of possibleTimes) {
        let currentTime = possibleTime;
        let dur = getDuration(currentTime);
        while (dur >= duration) {
            result.push([day, currentTime[0]]);
            currentTime[0] = addThirtyMinutes(currentTime[0]);
            dur = getDuration(currentTime);
        }
    }

    return result;
}

function getAppropriateRobberyTime(busyData, bankWorkFrom, bankWorkTo, duration) {
    let result = [];
    for (let day of robberyDay) {
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
            let answ = template;
            let robTime = robDayTime[1].split(':');
            answ = answ.replace('%DD', robDayTime[0])
                .replace('%HH', robTime[0])
                .replace('%MM', robTime[1]);

            return answ;
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
