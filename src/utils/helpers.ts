import * as moment from 'moment';
import * as bcrypt from 'bcrypt';
import {
  endOfDay,
  endOfWeek,
  startOfMonth,
  startOfDay,
  startOfWeek,
  endOfMonth,
  subWeeks,
  subMonths,
  endOfYear,
  subYears,
  startOfYear,
} from 'date-fns';

export function mergeErrors(errorsArray) {
  return errorsArray.reduce((acc, error) => {
    const key = Object.keys(error)[0];
    acc[key] = error[key];
    return acc;
  }, {});
}

export const generateNumericCode = () => {
  return Math.floor(10000 + Math.random() * 90000);
};

export const getTimeDifference = (time: Date) => {
  const now = moment(new Date());
  const inputTime = moment(time);

  const duration = moment.duration(now.diff(inputTime));

  const years = Math.abs(duration.years());
  const months = Math.abs(duration.months());
  const days = Math.abs(duration.days());
  const hours = Math.abs(duration.hours());
  const minutes = Math.abs(duration.minutes());
  const seconds = Math.abs(duration.seconds());
  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
  };
};

export const generatePasswordHash = async (
  password: string,
): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

export const generateOrderId = (prefix: string = 'ORD'): string => {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString()
    .slice(0, 7);
  const randomString = Math.floor(100 + Math.random() * 900).toString();
  return `${prefix}-${timestamp}-${randomString}`;
};

export const formatNumber = (
  _payload: string | number,
  addDecimal: boolean = false,
) => {
  if (!_payload) return _payload;
  // Convert payload to a number and fix it to two decimal places
  let payload = parseFloat(_payload.toString()).toFixed(2);

  // Handle the negative sign
  let sign = '';
  if (parseFloat(payload) < 0) {
    sign = '-';
    payload = payload.slice(1); // Remove the negative sign for formatting
  }

  // Split the integer and decimal parts
  const [integerPart, decimalPart] = payload.split('.');

  // Format the integer part with commas
  let result = '';
  let count = 0;

  for (let i = integerPart.length - 1; i >= 0; i--) {
    result = integerPart[i] + result;
    count++;
    if (count % 3 === 0 && i !== 0) {
      result = ',' + result;
    }
  }

  // Combine the formatted integer part with the decimal part
  result = sign + result + (addDecimal ? '.' + decimalPart : '');

  return result;
};

export const getDates = (date: string) => {
  let startDate: Date;
  let endDate: Date;

  switch (date) {
    case 'today':
      startDate = startOfDay(new Date());
      endDate = endOfDay(new Date());
      break;
    case 'thisWeek':
      startDate = startOfWeek(new Date());
      endDate = endOfWeek(new Date());
      break;
    case 'thisMonth':
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
      break;
    case 'thisYear':
      startDate = startOfYear(new Date());
      endDate = endOfYear(new Date());
      break;
    case 'lastWeek':
      startDate = subWeeks(startOfWeek(new Date()), 1);
      endDate = endOfWeek(subWeeks(new Date(), 1));
      break;
    case 'lastMonth':
      startDate = subMonths(startOfMonth(new Date()), 1);
      endDate = endOfMonth(subMonths(new Date(), 1));
      break;
    case 'last3Months':
      startDate = subMonths(startOfMonth(new Date()), 3);
      endDate = endOfMonth(new Date());
      break;
    case 'last6Months':
      startDate = subMonths(startOfMonth(new Date()), 6);
      endDate = endOfMonth(new Date());
      break;
    case 'lastYear':
      startDate = subYears(startOfYear(new Date()), 1);
      endDate = endOfYear(subYears(new Date(), 1));
      break;
    default:
      startDate = startOfDay(new Date());
      endDate = endOfDay(new Date());
      break;
  }

  return { startDate, endDate };
};
