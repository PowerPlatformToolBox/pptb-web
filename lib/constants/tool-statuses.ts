/**
 * Valid tool status values
 */
export const TOOL_STATUSES = {
    ACTIVE: "active",
    DEPRECATED: "deprecated",
    DELETED: "deleted",
} as const;

export type ToolStatus = (typeof TOOL_STATUSES)[keyof typeof TOOL_STATUSES];

export const VALID_TOOL_STATUSES = Object.values(TOOL_STATUSES);
