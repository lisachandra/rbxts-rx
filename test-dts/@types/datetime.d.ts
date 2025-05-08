/**
 * Describes a time value, returned from many of DateTime's methods and used for some of DateTime's constructors
 */
interface TimeValueTable {
	/** Range: 1400-9999 */
	Year: number;

	/** Range: 1-12 */
	Month: number;

	/** Range: 1-31 */
	Day: number;

	/** Range: 0-23 */
	Hour: number;

	/** Range: 0-59 */
	Minute: number;

	/**
	 * Range: 0-60
	 * Usually 0–59, sometimes 60 to accommodate leap seconds in certain systems.
	 */
	Second: number;

	/** Range: 0-999 */
	Millisecond: number;
}

/**
 * A DateTime represents a moment in time using a [Unix timestamp](https://en.wikipedia.org/wiki/Unix_time).
 * It can be used to easily format dates and times in specific locales.
 * When converted to a string, a string conversion of the stored timestamp integer is returned.
 * They do not store timezone values; rather, timezones are considered when constructing and using DateTime objects.
 * DateTime objects are equal if and only if their `UnixTimestampMillis` properties are equal.
 */
interface DateTime {
	/**
	 * **DO NOT USE!**
	 *
	 * This field exists to force TypeScript to recognize this as a nominal type
	 * @hidden
	 * @deprecated
	 */
	readonly _nominal_DateTime: unique symbol;

	/**
	 * The number of seconds since January 1st, 1970 at 00:00 UTC (the Unix epoch).
	 * For more information, see [Unix timestamp](https://en.wikipedia.org/wiki/Unix_time).
	 * Range is -17,987,443,200–253,402,300,799, approximately years 1400–9999.
	 */
	readonly UnixTimestamp: number;

	/**
	 * The number of milliseconds since January 1st, 1970 at 00:00 UTC (the Unix epoch).
	 * For more information, see [Unix timestamp](https://en.wikipedia.org/wiki/Unix_time).
	 * Range is -17,987,443,200,000 to 253,402,300,799,999, approximately years 1400–9999.
	 */
	readonly UnixTimestampMillis: number;

	/** Converts the value of this DateTime object to Universal Coordinated Time (UTC) */
	ToUniversalTime(this: DateTime): TimeValueTable;

	/** Converts the value of this DateTime object to local time */
	ToLocalTime(this: DateTime): TimeValueTable;

	/**
	 * Formats a date as a [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) date-time string.
	 * An example ISO 8601 date-time string would be `2020-01-02T10:30:45Z`, which represents January 2nd 2020 at 10:30 AM, 45 seconds.
	 */
	ToIsoDate(this: DateTime): string;

	/**
	 * Generates a string from the DateTime value interpreted as Universal Coordinated Time (UTC) and a format string.
	 * The format string should contain tokens, which will replace to certain date/time values described by the DateTime object.
	 * For details on all the available tokens, see [DateTime Format Strings](https://developer.roblox.com/articles/datetime-format-strings).
	 * @param format
	 * @param locale
	 */
	FormatUniversalTime(this: DateTime, format: string, locale: string): string;

	/**
	 * Generates a string from the DateTime value interpreted as local time and a format string.
	 * The format string should contain tokens, which will replace to certain date/time values described by the DateTime object.
	 * For details on all the available tokens, see [DateTime Format Strings](https://developer.roblox.com/articles/datetime-format-strings).
	 * @param format
	 * @param locale
	 */
	FormatLocalTime(this: DateTime, format: string, locale: string): string;
}

interface DateTimeConstructor {
	/** Creates a new DateTime representing the current moment in time */
	now: () => DateTime;

	/**
	 * Creates a new DateTime object from the given [Unix timestamp](https://en.wikipedia.org/wiki/Unix_time), or the number of seconds since January 1st, 1970 at 00:00 (UTC).
	 * @param unixTimestamp
	 */
	fromUnixTimestamp: (unixTimestamp: number) => DateTime;

	/**
	 * Creates a new DateTime object from the given [Unix timestamp](https://en.wikipedia.org/wiki/Unix_time), or the number of milliseconds since January 1st, 1970 at 00:00 (UTC).
	 * @param unixTimestampMillis
	 */
	fromUnixTimestampMillis: (unixTimestampMillis: number) => DateTime;

	/**
	 * Creates a new DateTime using the given units from a UTC time
	 * - Date units (year, month, day) that produce an invalid date will raise an error. For example, January 32nd or February 29th on a non-leap year.
	 * - Time units (hour, minute, second, millisecond) that are outside their normal range are valid. For example, 90 minutes will cause the hour to roll over by 1; -10 seconds will cause the minute value to roll back by 1.
	 * - Non-integer values are rounded down. For example, providing 2.5 hours will be equivalent to providing 2 hours, not 2 hours 30 minutes.
	 * - Omitted values are assumed to be their lowest value in their normal range, except for year which defaults to 1970.
	 * @param year Defaults to 1970
	 * @param month Defaults to 1
	 * @param day Defaults to 1
	 * @param hour Defaults to 0
	 * @param minute Defaults to 0
	 * @param second Defaults to 0
	 * @param millisecond Defaults to 0
	 */
	fromUniversalTime: (
		year?: number,
		month?: number,
		day?: number,
		hour?: number,
		minute?: number,
		second?: number,
		millisecond?: number,
	) => DateTime;

	/**
	 * Creates a new DateTime using the given units from a local time
	 * - Date units (year, month, day) that produce an invalid date will raise an error. For example, January 32nd or February 29th on a non-leap year.
	 * - Time units (hour, minute, second, millisecond) that are outside their normal range are valid. For example, 90 minutes will cause the hour to roll over by 1; -10 seconds will cause the minute value to roll back by 1.
	 * - Non-integer values are rounded down. For example, providing 2.5 hours will be equivalent to providing 2 hours, not 2 hours 30 minutes.
	 * - Omitted values are assumed to be their lowest value in their normal range, except for year which defaults to 1970.
	 * @param year Defaults to 1970
	 * @param month Defaults to 1
	 * @param day Defaults to 1
	 * @param hour Defaults to 0
	 * @param minute Defaults to 0
	 * @param second Defaults to 0
	 * @param millisecond Defaults to 0
	 */
	fromLocalTime: (
		year?: number,
		month?: number,
		day?: number,
		hour?: number,
		minute?: number,
		second?: number,
		millisecond?: number,
	) => DateTime;

	/**
	 * Creates a DateTime from an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) date-time string in UTC time.
	 * If the string parsing fails, returns nil.
	 * An example ISO 8601 date-time string would be `2020-01-02T10:30:45Z`, which represents January nd 2020 at 10:30 AM, 45 seconds.
	 * @param isoDate
	 */
	fromIsoDate: (isoDate: string) => DateTime | undefined;
}

declare const DateTime: DateTimeConstructor;
