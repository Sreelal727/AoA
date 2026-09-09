// Internal functions: not callable from a browser. The Vercel API calls them
// with the deploy key, so the only secret involved is the one in Vercel.
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("entries").collect();
    return rows.map(({ _id, _creationTime, entryId, ...rest }) => ({ id: entryId, ...rest }));
  },
});

export const add = internalMutation({
  args: {
    entryId: v.string(),
    clauseId: v.string(),
    type: v.string(),
    status: v.optional(v.string()),
    text: v.string(),
    at: v.string(),
    by: v.string(),
    byName: v.string(),
    byRole: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("entries").withIndex("by_entryId", (q) => q.eq("entryId", args.entryId)).first();
    if (existing) return existing._id;
    return await ctx.db.insert("entries", args);
  },
});
