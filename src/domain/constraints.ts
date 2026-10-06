/**
 * Constraint definitions and evaluation for Pips regions.
 */

export type Constraint =
  | { type: "sum"; value: number }
  | { type: "lessThan"; value: number }
  | { type: "greaterThan"; value: number }
  | { type: "equal" }
  | { type: "different" };

export interface RegionEvaluation {
  complete: boolean; // every cell in the region has a value
  valid: boolean; // condition satisfied (or not yet violated if incomplete)
  impossible: boolean; // known to be impossible even if partially filled
  currentSum: number;
  expectedDescription?: string;
  errorReason?: string;
}

/**
 * Format constraint to short display string (e.g., "11", "<2", ">4", "=").
 */
export function formatConstraint(constraint: Constraint | null): string {
  if (!constraint) return "";
  switch (constraint.type) {
    case "sum":
      return `${constraint.value}`;
    case "lessThan":
      return `<${constraint.value}`;
    case "greaterThan":
      return `>${constraint.value}`;
    case "equal":
      return "=";
    case "different":
      return "≠";
  }
}

/**
 * Parses constraint from text string like "11", "<2", ">4", "=".
 */
export function parseConstraint(token: string): Constraint | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (trimmed === "=") return { type: "equal" };
  if (trimmed === "≠" || trimmed.toLowerCase() === "diff") return { type: "different" };

  if (trimmed.startsWith("<")) {
    const val = parseInt(trimmed.slice(1), 10);
    return isNaN(val) ? null : { type: "lessThan", value: val };
  }

  if (trimmed.startsWith(">")) {
    const val = parseInt(trimmed.slice(1), 10);
    return isNaN(val) ? null : { type: "greaterThan", value: val };
  }

  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) {
    return { type: "sum", value: num };
  }

  return null;
}
