// Centralized sub-stage definitions for "Not Interested" and "Not Connected" lead statuses.
// Used by:
//   - Lead detail feedback form (when user picks Not Interested / Not Connected)
//   - Lead list filter (sub-filter that appears when Not Interested / Not Connected is selected)
//   - Backend API (validation / persistence)

export const NOT_INTERESTED_SUB_STAGES = [
  "No Requirement",
  "Location Mismatch",
  "Budget Issue",
  "Flat Size Issue",
  "Want Land",
  "Want Bungalow",
  "Invalid No",
  "ISD No",
] as const;

export const NOT_CONNECTED_SUB_STAGES = [
  "Switch Off",
  "Incoming Call Not Available",
  "Disconnected",
  "Ringing",
  "Out of Network Service",
] as const;

export type NotInterestedSubStage = (typeof NOT_INTERESTED_SUB_STAGES)[number];
export type NotConnectedSubStage = (typeof NOT_CONNECTED_SUB_STAGES)[number];

/**
 * Returns the list of sub-stages for a given leadStatus, or an empty array
 * if the status doesn't have sub-stages.
 */
export function getSubStagesForStatus(leadStatus: string | null | undefined): readonly string[] {
  if (!leadStatus) return [];
  if (leadStatus === "Not Interested") return NOT_INTERESTED_SUB_STAGES;
  if (leadStatus === "Not Connected") return NOT_CONNECTED_SUB_STAGES;
  return [];
}

/**
 * True if the given leadStatus supports sub-stages (i.e. is "Not Interested" or "Not Connected").
 */
export function hasSubStages(leadStatus: string | null | undefined): boolean {
  return leadStatus === "Not Interested" || leadStatus === "Not Connected";
}

/**
 * Validates that a subStage is legal for the given leadStatus.
 */
export function isValidSubStage(leadStatus: string | null | undefined, subStage: string | null | undefined): boolean {
  if (!hasSubStages(leadStatus)) {
    // For other statuses, subStage must be empty / null
    return !subStage;
  }
  if (!subStage) return false;
  return getSubStagesForStatus(leadStatus).includes(subStage);
}
