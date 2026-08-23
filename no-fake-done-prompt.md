# Execution Rules — No "Done" Without Proof

Add this to the top of your master prompt (or paste it any time the agent starts summarizing instead of building).

---

Do not tell me a feature, file, or step is "done," "complete," "implemented," or "ready" unless all of the following are true. If any is not true, say what's missing instead of saying done.

1. **The code actually exists in a file** — not described in a message. Show me the file path and the real code you wrote, not a summary of what it "would" contain.
2. **It runs.** Run the dev server / build / test command yourself in the terminal after writing the code. Paste the actual terminal output (success or error). If you did not run it, say "not yet run" — do not say done.
3. **No placeholders, stubs, or TODOs left in place of real logic**, unless I explicitly told you to stub something. If something is temporarily faked (mock data, hardcoded value, `// TODO`), call it out by name — do not fold it into a "done" summary.
4. **The specific feature I asked for actually works end-to-end**, not just a piece of it. Example: "YouTube Lectures module done" is not true if the player embeds but progress tracking, timestamp questions, and Supabase save-on-complete aren't wired up. List each sub-requirement and mark each one individually as done / partial / not started.
5. **If you hit an error or can't finish something, say so plainly** — "this failed because X" — instead of glossing over it or silently switching to a simpler version of the feature.
6. **Before moving to the next step, give me a short checklist** of what was actually verified working in this step, so I can catch gaps immediately instead of finding out later that half of it was never real.

If I ask "is X actually working right now" and it is not, say "no, here's the real status" — never say yes to avoid friction.
