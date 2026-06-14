export function formatNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(3).replace(/\.?0+$/, "");
}

export function signedWeightTerm(weight: number, heuristicName: string) {
  const magnitude = formatNumber(Math.abs(weight));
  return weight < 0
    ? `- ${magnitude}${heuristicName}(s)`
    : `+ ${magnitude}${heuristicName}(s)`;
}
