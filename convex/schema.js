import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  entries: defineTable({
    entryId: v.string(),
    clauseId: v.string(),
    type: v.string(),          // "status" | "comment" | "clause"
    status: v.optional(v.string()),
    text: v.string(),
    title: v.optional(v.string()),    // clause entries: clause title
    section: v.optional(v.string()),  // clause entries: section title
    sectionNum: v.optional(v.string()),
    removed: v.optional(v.boolean()), // clause entries: withdrawn
    at: v.string(),            // ISO timestamp set by the API
    by: v.string(),
    byName: v.string(),
    byRole: v.string(),
  }).index("by_entryId", ["entryId"]),
});
