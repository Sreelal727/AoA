import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  entries: defineTable({
    entryId: v.string(),
    clauseId: v.string(),
    type: v.string(),          // "status" | "comment"
    status: v.optional(v.string()),
    text: v.string(),
    at: v.string(),            // ISO timestamp set by the API
    by: v.string(),
    byName: v.string(),
    byRole: v.string(),
  }).index("by_entryId", ["entryId"]),
});
