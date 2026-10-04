export const functionLineSeed = (seed: number) => {
  const safe = seed >>> 0;
  return { slope: 1 + (safe % 3), intercept: (Math.floor(safe / 3) % 3) - 1 };
};
