export const CHECK_DIGIT_POSITION = 4;

export const PARTIALS = [
	{ start: 0, end: 9, checkIdx: 9 },
	{ start: 10, end: 20, checkIdx: 20 },
	{ start: 21, end: 31, checkIdx: 31 },
];

export const CONVERT_POSITIONS = [
	[0, 4],
	[32, 47],
	[4, 9],
	[10, 20],
	[21, 31],
] as const;
